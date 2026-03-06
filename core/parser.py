# core/parser.py
import tree_sitter_python as tspython
from tree_sitter import Language, Parser, Query, QueryCursor
from core.models import ParsedModule, ParsedNode, CodeRange, ParsedImport, ParsedCall

class CodeParser:
    def __init__(self):
        self.language = Language(tspython.language())
        self.parser = Parser(self.language)
        
        self.struct_query = Query(self.language, """
            (class_definition name: (identifier) @class.name) @class.def
            (function_definition name: (identifier) @func.name) @func.def
        """)
        
        self.import_query = Query(self.language, """
            (import_statement) @import
            (import_from_statement) @import_from
        """)

        # NEW: Query to find function calls
        self.call_query = Query(self.language, """
            (call function: (_) @call.func)
        """)

    def _get_enclosing_scope(self, node) -> str:
        """Walks up the AST to find the function and class that contains this node."""
        current = node.parent
        func_name = None
        class_name = None

        while current:
            if current.type == 'function_definition' and not func_name:
                for child in current.children:
                    if child.type == 'identifier':
                        func_name = child.text.decode('utf8')
                        break
            elif current.type == 'class_definition' and not class_name:
                for child in current.children:
                    if child.type == 'identifier':
                        class_name = child.text.decode('utf8')
                        break
            current = current.parent
        
        if class_name and func_name:
            return f"{class_name}.{func_name}"
        elif func_name:
            return func_name
        elif class_name:
            return class_name
        return "global"

    def parse_file(self, filepath: str) -> ParsedModule:
        with open(filepath, 'rb') as f:
            source_code = f.read()

        tree = self.parser.parse(source_code)
        module = ParsedModule(filepath=filepath)

        # 1. Classes and Functions (Updated with parent_name)
        struct_cursor = QueryCursor(self.struct_query)
        for match in struct_cursor.matches(tree.root_node):
            captures = match[1]
            if "class.def" in captures and "class.name" in captures:
                module.classes.append(self._create_node(
                    captures["class.name"][0].text.decode('utf8'), 'class', captures["class.def"][0], source_code
                ))
            elif "func.def" in captures and "func.name" in captures:
                func_node = captures["func.def"][0]
                # Check if it's inside a class
                parent_scope = self._get_enclosing_scope(func_node.parent)
                
                parsed_node = self._create_node(
                    captures["func.name"][0].text.decode('utf8'), 'function', func_node, source_code
                )
                if parent_scope != "global":
                    parsed_node.parent_name = parent_scope

                module.functions.append(parsed_node)

        # 2. Imports (Keep your existing import logic here)
        import_cursor = QueryCursor(self.import_query)
        for match in import_cursor.matches(tree.root_node):
            captures = match[1]
            if "import" in captures:
                for node in captures["import"]:
                    for child in node.children:
                        if child.type == 'dotted_name':
                            module.imports.append(ParsedImport(module=child.text.decode('utf8'), line=node.start_point[0]+1))
                        elif child.type == 'aliased_import':
                            for c in child.children:
                                if c.type == 'dotted_name':
                                    module.imports.append(ParsedImport(module=c.text.decode('utf8'), line=node.start_point[0]+1))
            elif "import_from" in captures:
                for node in captures["import_from"]:
                    from_idx, import_idx = -1, -1
                    for i, child in enumerate(node.children):
                        if child.type == 'from': from_idx = i
                        if child.type == 'import': import_idx = i
                    
                    module_name = ""
                    if from_idx != -1 and import_idx != -1 and import_idx > from_idx + 1:
                        parts = [node.children[i].text.decode('utf8') for i in range(from_idx+1, import_idx)]
                        module_name = "".join(parts).strip()
                    
                    imported_names = []
                    if import_idx != -1:
                        for i in range(import_idx + 1, len(node.children)):
                            child = node.children[i]
                            if child.type in ['dotted_name', 'aliased_import', 'identifier']:
                                imported_names.append(child.text.decode('utf8'))

                    if module_name:
                        module.imports.append(ParsedImport(
                            module=module_name, names=imported_names, line=node.start_point[0]+1
                        ))

        # 3. Process Function Calls (NEW)
        call_cursor = QueryCursor(self.call_query)
        for match in call_cursor.matches(tree.root_node):
            captures = match[1]
            if "call.func" in captures:
                func_node = captures["call.func"][0]
                
                # Extract the name of the function being called
                callee_name = func_node.text.decode('utf8')
                
                # If it's a method call like `self.parser.parse`, extract just `parse`
                if func_node.type == 'attribute':
                    callee_name = func_node.child_by_field_name('attribute').text.decode('utf8')

                caller_name = self._get_enclosing_scope(func_node)
                
                module.calls.append(ParsedCall(
                    caller=caller_name,
                    callee=callee_name,
                    line=func_node.start_point[0] + 1
                ))

        return module

    def _create_node(self, name: str, node_type: str, node, source_code: bytes) -> ParsedNode:
        snippet = source_code[node.start_byte:node.end_byte].decode('utf8')
        return ParsedNode(
            name=name, node_type=node_type,
            range=CodeRange(
                start_line=node.start_point[0] + 1, end_line=node.end_point[0] + 1,
                start_byte=node.start_byte, end_byte=node.end_byte
            ),
            code_snippet=snippet
        )