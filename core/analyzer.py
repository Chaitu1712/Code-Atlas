import sqlite3
import networkx as nx
from typing import Dict, List, Any

class GraphAnalyzer:
    def __init__(self, db_path: str = "atlas.db"):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self.graph = nx.DiGraph()

    def _normalize_path(self, filepath: str) -> str:
        clean_path = filepath.replace(".py", "").replace("\\", ".").replace("/", ".")
        if clean_path.endswith('.__init__'):
            clean_path = clean_path[:-9]
        elif clean_path == "__init__":
            clean_path = "root"
        return clean_path

    def _resolve_import(self, source_module: str, imported_module: str) -> str:
        if not imported_module.startswith("."): return imported_module
        dot_count = len(imported_module) - len(imported_module.lstrip("."))
        relative_name = imported_module.lstrip(".")
        parts = source_module.split(".")
        if dot_count > len(parts): return imported_module
        parent_parts = parts[:-dot_count]
        if relative_name: parent_parts.append(relative_name)
        return ".".join(parent_parts)

    def _add_packages(self, module_name: str):
        parts = module_name.split(".")
        for i in range(1, len(parts)):
            pkg_name = ".".join(parts[:i])
            parent_pkg = ".".join(parts[:i-1]) if i > 1 else None
            if not self.graph.has_node(pkg_name):
                self.graph.add_node(pkg_name, type="package", parent=parent_pkg)
            if parent_pkg:
                self.graph.add_edge(parent_pkg, pkg_name, type="contains")

    def build_module_graph(self):
        self.cursor.execute("SELECT id, filepath FROM files")
        files = {row[0]: self._normalize_path(row[1]) for row in self.cursor.fetchall()}
        internal_modules = set(files.values())

        for file_id, mod_name in files.items():
            parent = ".".join(mod_name.split(".")[:-1]) if "." in mod_name else None
            self.graph.add_node(mod_name, type="module_internal", parent=parent)
            self._add_packages(mod_name)
            if parent:
                self.graph.add_edge(parent, mod_name, type="contains")

        self.cursor.execute("SELECT file_id, name, node_type, parent_name FROM nodes")
        nodes_lookup = {}
        
        for file_id, name, node_type, parent_name in self.cursor.fetchall():
            mod_name = files[file_id]
            if parent_name:
                node_id = f"{mod_name}.{parent_name}.{name}"
                parent_id = f"{mod_name}.{parent_name}"
            else:
                node_id = f"{mod_name}.{name}"
                parent_id = mod_name
                
            self.graph.add_node(node_id, type=node_type, parent=parent_id)
            
            self.graph.add_edge(parent_id, node_id, type="contains")
            nodes_lookup[name] = node_id

        self.cursor.execute("SELECT file_id, caller, callee FROM calls")
        for file_id, caller, callee in self.cursor.fetchall():
            mod_name = files[file_id]
            caller_id = f"{mod_name}.{caller}" if caller != "global" else mod_name
            callee_id = nodes_lookup.get(callee)
            
            if callee_id and self.graph.has_node(caller_id) and self.graph.has_node(callee_id):

                caller_parent = self.graph.nodes[caller_id].get('parent')
                callee_parent = self.graph.nodes[callee_id].get('parent')
                
                edge_type = "call_internal" if caller_parent == callee_parent else "call_external"
                self.graph.add_edge(caller_id, callee_id, type=edge_type)

        self.cursor.execute("SELECT file_id, imported_module, imported_names FROM imports")
        for file_id, imported_module, imported_names in self.cursor.fetchall():
            source_module = files[file_id]
            resolved_imported_module = self._resolve_import(source_module, imported_module)

            if resolved_imported_module not in internal_modules:
                if not self.graph.has_node(resolved_imported_module):
                    self.graph.add_node(resolved_imported_module, type="module_external")

            self.graph.add_edge(source_module, resolved_imported_module, symbols=imported_names, type="import")

        self.cursor.execute("SELECT node_id, fx, fy FROM layout")
        for node_id, fx, fy in self.cursor.fetchall():
            if self.graph.has_node(node_id):
                self.graph.nodes[node_id]['fx'] = fx
                self.graph.nodes[node_id]['fy'] = fy
        
        self.cursor.execute("SELECT caller_node_id, endpoint_node_id, path FROM api_edges")
        for caller_id, endpoint_id, path in self.cursor.fetchall():
            if self.graph.has_node(caller_id) and self.graph.has_node(endpoint_id):
                self.graph.add_edge(caller_id, endpoint_id, type="api_call", path=path)
    
    def export_json(self) -> Dict[str, Any]:
        return nx.node_link_data(self.graph)