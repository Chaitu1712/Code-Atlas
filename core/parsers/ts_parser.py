import tree_sitter_typescript as tsts
from tree_sitter import Language, Parser, Query, QueryCursor
from core.models import ParsedModule, ParsedNode, CodeRange, ParsedCall
import re

class TSParser:
    def __init__(self):
        self.language = Language(tsts.language_typescript())
        self.parser = Parser(self.language)
        self.struct_query = Query(self.language, """
            (class_declaration name: (type_identifier) @class.name) @class.def
            (function_declaration name: (identifier) @func.name) @func.def
            (lexical_declaration (variable_declarator name: (identifier) @func.name value: [(arrow_function) (function_expression)])) @func.def
        """)

    def parse_file(self, filepath: str) -> ParsedModule:
        with open(filepath, 'rb') as f: source_code = f.read()
        tree = self.parser.parse(source_code)
        module = ParsedModule(filepath=filepath)

        # Classes and Functions
        for match in QueryCursor(self.struct_query).matches(tree.root_node):
            captures = match[1]
            if "class.def" in captures:
                module.classes.append(self._create_node(captures["class.name"][0].text.decode('utf8'), 'class', captures["class.def"][0], source_code))
            elif "func.def" in captures:
                node = captures["func.def"][0]
                name = captures["func.name"][0].text.decode('utf8')
                parsed_node = self._create_node(name, 'function', node, source_code)
                
                # --- NEW: Extract API Consumers (fetch/axios) ---
                # A simple regex on the snippet captures the network calls easily
                consumer_match = re.search(r'(?:fetch|axios\.(get|post|put|delete))\([\'"`]([^\'"`]+)[\'"`]', parsed_node.code_snippet)
                if consumer_match:
                    method = (consumer_match.group(1) or 'get').upper()
                    path = consumer_match.group(2)
                    # We log the call on the ParsedNode (to be moved to calls later, or tracked globally)
                    module.calls.append(ParsedCall(caller=name, callee="API", line=node.start_point[0], api_call=f"{method} {path}"))

                module.functions.append(parsed_node)

        return module

    def _create_node(self, name, node_type, node, source_code) -> ParsedNode:
        snippet = source_code[node.start_byte:node.end_byte].decode('utf8')
        return ParsedNode(name=name, node_type=node_type, range=CodeRange(start_line=node.start_point[0]+1, end_line=node.end_point[0]+1, start_byte=node.start_byte, end_byte=node.end_byte), code_snippet=snippet)