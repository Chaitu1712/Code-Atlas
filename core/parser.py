import tree_sitter_python as tspython
from tree_sitter import Language, Parser, Query, QueryCursor
from core.models import ParsedModule, ParsedNode, CodeRange, ParsedImport

class CodeParser:
    def __init__(self):
        self.language = Language(tspython.language())
        self.parser = Parser(self.language)
        
        # Existing query for classes/functions
        self.struct_query = Query(self.language, """
            (class_definition name: (identifier) @class.name) @class.def
            (function_definition name: (identifier) @func.name) @func.def
        """)
        
        # NEW: Query for imports
        self.import_query = Query(self.language, """
            (import_statement) @import
            (import_from_statement) @import_from
        """)

    def parse_file(self, filepath: str) -> ParsedModule:
        with open(filepath, 'rb') as f:
            source_code = f.read()

        tree = self.parser.parse(source_code)
        module = ParsedModule(filepath=filepath)

        # 1. Process Classes and Functions
        struct_cursor = QueryCursor(self.struct_query)
        for match in struct_cursor.matches(tree.root_node):
            captures = match[1]
            if "class.def" in captures and "class.name" in captures:
                module.classes.append(self._create_node(
                    captures["class.name"][0].text.decode('utf8'), 'class', captures["class.def"][0], source_code
                ))
            elif "func.def" in captures and "func.name" in captures:
                module.functions.append(self._create_node(
                    captures["func.name"][0].text.decode('utf8'), 'function', captures["func.def"][0], source_code
                ))


# 2. Process Imports (inside core/parser.py -> parse_file)
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
                    # Robust way to handle relative imports: 
                    # Find exactly what text sits between the 'from' and 'import' tokens
                    from_idx, import_idx = -1, -1
                    for i, child in enumerate(node.children):
                        if child.type == 'from': from_idx = i
                        if child.type == 'import': import_idx = i
                    
                    module_name = ""
                    if from_idx != -1 and import_idx != -1 and import_idx > from_idx + 1:
                        parts = [node.children[i].text.decode('utf8') for i in range(from_idx+1, import_idx)]
                        module_name = "".join(parts).strip()
                    
                    # Extract the specific symbols/names being imported
                    imported_names =[]
                    if import_idx != -1:
                        for i in range(import_idx + 1, len(node.children)):
                            child = node.children[i]
                            if child.type in ['dotted_name', 'aliased_import', 'identifier']:
                                imported_names.append(child.text.decode('utf8'))

                    if module_name:
                        module.imports.append(ParsedImport(
                            module=module_name,
                            names=imported_names,
                            line=node.start_point[0]+1
                        ))
        return module

    def _create_node(self, name: str, node_type: str, node, source_code: bytes) -> ParsedNode:
        # Slice the raw bytes using tree-sitter's byte ranges and decode
        snippet = source_code[node.start_byte:node.end_byte].decode('utf8')
        return ParsedNode(
            name=name, node_type=node_type,
            range=CodeRange(
                start_line=node.start_point[0] + 1, end_line=node.end_point[0] + 1,
                start_byte=node.start_byte, end_byte=node.end_byte
            ),
            code_snippet=snippet
        )