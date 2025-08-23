import os
import json
from tree_sitter import Language, Parser
import tree_sitter_python

# Create Python language object
PY_LANGUAGE = Language(tree_sitter_python.language())

# Parser instance
parser = Parser(PY_LANGUAGE)

def read_file_lines(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.readlines()

def list_python_files(root_dir):
    py_files = []
    for dirpath, _, filenames in os.walk(root_dir):
        for file in filenames:
            if file.endswith(".py"):
                py_files.append(os.path.join(dirpath, file))
    return py_files

def extract_imports(tree, lines):
    imports = []
    cursor = tree.walk()

    def traverse(node):
        if node.type in ("import_statement", "import_from_statement"):
            imports.append("".join(lines[node.start_point[0]:node.end_point[0] + 1]).strip())
        for child in node.children:
            traverse(child)

    traverse(cursor.node)
    return imports

def extract_elements(file_path, lines, tree):
    elements = []

    def get_code(node):
        return "".join(lines[node.start_point[0]:node.end_point[0] + 1])

    def get_calls(node):
        calls = []
        def traverse_calls(n):
            if n.type == "call":
                target = n.child_by_field_name("function")
                if target:
                    calls.append(get_code(target).strip())
            for child in n.children:
                traverse_calls(child)
        traverse_calls(node)
        return calls

    def traverse(node, parent_name=""):
        if node.type == "function_definition":
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode() if name_node else "<anonymous>"
            fq_name = f"{parent_name}.{name}" if parent_name else name
            elements.append({
                "id": f"{file_path}::{fq_name}",
                "type": "function",
                "file": file_path,
                "name": fq_name,
                "line_range": [node.start_point[0] + 1, node.end_point[0] + 1],
                "code": get_code(node),
                "relationships": {
                    "calls": get_calls(node),
                    "imports": []  # Will be filled later
                }
            })
        elif node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            name = name_node.text.decode() if name_node else "<anonymous>"
            fq_name = f"{parent_name}.{name}" if parent_name else name
            elements.append({
                "id": f"{file_path}::{fq_name}",
                "type": "class",
                "file": file_path,
                "name": fq_name,
                "line_range": [node.start_point[0] + 1, node.end_point[0] + 1],
                "code": get_code(node),
                "relationships": {
                    "calls": get_calls(node),
                    "imports": []
                }
            })
            for child in node.children:
                traverse(child, fq_name)
        else:
            for child in node.children:
                traverse(child, parent_name)

    traverse(tree.root_node)
    return elements

def parse_codebase(root_dir):
    all_elements = []
    for file_path in list_python_files(root_dir):
        lines = read_file_lines(file_path)
        code = "".join(lines)
        tree = parser.parse(code.encode("utf8"))
        imports = extract_imports(tree, lines)
        elements = extract_elements(file_path, lines, tree)
        for el in elements:
            el["relationships"]["imports"] = imports
        all_elements.extend(elements)
    return {"elements": all_elements}

if __name__ == "__main__":
    repo_path = "data/sample_repo"  # Change as needed
    result = parse_codebase(repo_path)
    os.makedirs("data", exist_ok=True)
    with open("data/parsed.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"Parsed {len(result['elements'])} elements → data/parsed.json")
