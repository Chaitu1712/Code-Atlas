import sqlite3
import networkx as nx
from typing import Dict, List, Any

from core.strategies.path_normalizer import normalize_path
from core.strategies.import_resolver import resolve_import

class GraphAnalyzer:
    def __init__(self, db_path: str = "atlas.db"):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self.graph = nx.DiGraph()

    def _add_packages(self, module_name: str):
        """Creates hierarchical parent nodes for submodules."""
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
        
        files_dict = {}
        normalized_modules = {}
        for row in self.cursor.fetchall():
            file_id, filepath = row
            files_dict[file_id] = filepath
            normalized_modules[file_id] = normalize_path(filepath)
            
        internal_modules = set(normalized_modules.values())

        # 1. Add Internal Files & Packages
        for file_id, mod_name in normalized_modules.items():
            parent = ".".join(mod_name.split(".")[:-1]) if "." in mod_name else None
            self.graph.add_node(mod_name, type="module_internal", parent=parent)
            self._add_packages(mod_name)
            if parent:
                self.graph.add_edge(parent, mod_name, type="contains")

        # 2. Add Classes & Functions (Nodes)
        self.cursor.execute("SELECT file_id, name, node_type, parent_name FROM nodes")
        nodes_lookup = {}
        
        for file_id, name, node_type, parent_name in self.cursor.fetchall():
            mod_name = normalized_modules[file_id]
            if parent_name:
                node_id = f"{mod_name}.{parent_name}.{name}"
                parent_id = f"{mod_name}.{parent_name}"
            else:
                node_id = f"{mod_name}.{name}"
                parent_id = mod_name
                
            self.graph.add_node(node_id, type=node_type, parent=parent_id)
            self.graph.add_edge(parent_id, node_id, type="contains")
            
            # Map the clean name (e.g., 'CodeParser') to its global ID
            nodes_lookup[name] = node_id

        # 3. Add Call Edges (Functions calling Functions)
        self.cursor.execute("SELECT file_id, caller, callee FROM calls")
        for file_id, caller, callee in self.cursor.fetchall():
            mod_name = normalized_modules[file_id]
            caller_id = f"{mod_name}.{caller}" if caller != "global" else mod_name
            callee_id = nodes_lookup.get(callee)
            
            if callee_id and self.graph.has_node(caller_id) and self.graph.has_node(callee_id):
                caller_parent = self.graph.nodes[caller_id].get('parent')
                callee_parent = self.graph.nodes[callee_id].get('parent')
                edge_type = "call_internal" if caller_parent == callee_parent else "call_external"
                self.graph.add_edge(caller_id, callee_id, type=edge_type)

        # 4. Process Imports using DB Lookups & Deep Linking
        self.cursor.execute("SELECT file_id, imported_module, imported_names FROM imports")
        for file_id, imported_module, imported_names_str in self.cursor.fetchall():
            source_filepath = files_dict[file_id]
            source_module = normalized_modules[file_id]
            imported_names = imported_names_str.split(",") if imported_names_str else []
            
            # Step A: Resolve the FILE we are importing from
            resolved_file_module = resolve_import(source_filepath, source_module, imported_module, internal_modules)

            if resolved_file_module not in internal_modules:
                if not self.graph.has_node(resolved_file_module):
                    self.graph.add_node(resolved_file_module, type="module_external")

            # Step B: DEEP LINKING (The User's Idea!)
            linked_deeply = False
            
            # If we imported specific names (e.g., CodeParser or VisualizerPage)
            if imported_names and resolved_file_module in internal_modules:
                for name in imported_names:
                    # Construct the exact Node ID (e.g., 'core.parser.CodeParser')
                    potential_node_id = f"{resolved_file_module}.{name}"
                    
                    if self.graph.has_node(potential_node_id):
                        # Draw the line DIRECTLY to the Class/Function!
                        self.graph.add_edge(source_module, potential_node_id, symbols=name, type="import")
                        linked_deeply = True

            # Step C: Fallback to File-level linking
            # (If it was an external module, or an import without specific names like `import os`)
            if not linked_deeply:
                self.graph.add_edge(source_module, resolved_file_module, symbols=imported_names_str, type="import")

        # 5. Apply Saved Layout Positions
        self.cursor.execute("SELECT node_id, fx, fy FROM layout")
        for node_id, fx, fy in self.cursor.fetchall():
            if self.graph.has_node(node_id):
                self.graph.nodes[node_id]['fx'] = fx
                self.graph.nodes[node_id]['fy'] = fy

        # 6. Inject Cross-Language API Edges
        self.cursor.execute("SELECT caller_node_id, endpoint_node_id, path FROM api_edges")
        for caller_id, endpoint_id, path in self.cursor.fetchall():
            if self.graph.has_node(caller_id) and self.graph.has_node(endpoint_id):
                self.graph.add_edge(caller_id, endpoint_id, type="api_call", path=path)

    def get_cyclic_dependencies(self) -> List[List[str]]:
        try:
            return list(nx.simple_cycles(self.graph))
        except nx.NetworkXNoCycle:
            return []

    def export_json(self) -> Dict[str, Any]:
        return nx.node_link_data(self.graph)