# core/analyzer.py
import sqlite3
import networkx as nx
from typing import Dict, List, Any

class GraphAnalyzer:
    def __init__(self, db_path: str = "atlas.db"):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self.graph = nx.DiGraph()

    def _normalize_path(self, filepath: str) -> str:
        """Handles standard paths and package __init__.py files"""
        clean_path = filepath.replace(".py", "").replace("\\", ".").replace("/", ".")
        if clean_path.endswith('.__init__'):
            clean_path = clean_path[:-9]  # core.__init__ becomes 'core'
        elif clean_path == "__init__":
            clean_path = "root"
        return clean_path

    def _resolve_import(self, source_module: str, imported_module: str) -> str:
        """Resolves relative imports like '.models' from 'core.db' -> 'core.models'"""
        if not imported_module.startswith("."):
            return imported_module
        
        dot_count = len(imported_module) - len(imported_module.lstrip("."))
        relative_name = imported_module.lstrip(".")
        
        parts = source_module.split(".")
        if dot_count > len(parts):
            return imported_module  # Fallback
            
        parent_parts = parts[:-dot_count]
        if relative_name:
            parent_parts.append(relative_name)
            
        return ".".join(parent_parts)

    def _add_packages(self, module_name: str):
        """Creates hierarchical parent nodes for submodules"""
        parts = module_name.split(".")
        for i in range(1, len(parts)):
            pkg_name = ".".join(parts[:i])
            parent_pkg = ".".join(parts[:i-1]) if i > 1 else None
            
            if not self.graph.has_node(pkg_name):
                # We add 'parent' so D3.js/Cytoscape can group these nodes into a collapsible box!
                self.graph.add_node(pkg_name, type="package", parent=parent_pkg)

    def build_module_graph(self):
        self.cursor.execute("SELECT id, filepath FROM files")
        files = {row[0]: self._normalize_path(row[1]) for row in self.cursor.fetchall()}
        internal_modules = set(files.values())

        # 1. Add internal nodes and package hierarchy
        for file_id, mod_name in files.items():
            parent = ".".join(mod_name.split(".")[:-1]) if "." in mod_name else None
            self.graph.add_node(mod_name, type="module_internal", parent=parent)
            self._add_packages(mod_name)

        # 2. Process imports and build edges
        self.cursor.execute("SELECT file_id, imported_module, imported_names FROM imports")
        for file_id, imported_module, imported_names in self.cursor.fetchall():
            source_module = files[file_id]
            
            # Submodule / Relative Path resolution
            resolved_imported_module = self._resolve_import(source_module, imported_module)

            if resolved_imported_module not in internal_modules:
                if not self.graph.has_node(resolved_imported_module):
                    self.graph.add_node(resolved_imported_module, type="module_external")

            # We can now attach the exact symbols imported to the edge for UI tooltips!
            self.graph.add_edge(source_module, resolved_imported_module, symbols=imported_names)

    def get_cyclic_dependencies(self) -> List[List[str]]:
        try:
            return list(nx.simple_cycles(self.graph))
        except nx.NetworkXNoCycle:
            return[]

    def export_json(self) -> Dict[str, Any]:
        return nx.node_link_data(self.graph)