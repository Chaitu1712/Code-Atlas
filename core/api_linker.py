import sqlite3
import re
from core.strategies.path_normalizer import normalize_path

class APILinker:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def _normalize_route(self, route: str) -> str:
        """
        Converts "GET http://api.com/users/${id}" -> "GET /users/{}"
        Converts "GET /users/{user_id}" -> "GET /users/{}"
        """
        # 1. Strip domains (http://localhost:8000)
        route = re.sub(r'https?://[^/]+', '', route)
        
        # 2. Normalize JS template literals ${var} -> {}
        route = re.sub(r'\$\{[^}]+\}', '{}', route)
        
        # 3. Normalize Python path variables {var} -> {}
        route = re.sub(r'\{[^}]+\}', '{}', route)
        
        # 4. Remove trailing slashes
        if route.endswith('/') and len(route) > 1:
            route = route[:-1]
            
        return route.strip().upper()

    def run_linkage(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM api_edges")

        # 1. Get Endpoints (Providers)
        cursor.execute("SELECT f.filepath, n.parent_name, n.name, n.api_endpoint FROM nodes n JOIN files f ON n.file_id = f.id WHERE n.api_endpoint IS NOT NULL")
        endpoints = []
        for filepath, parent, name, endpoint in cursor.fetchall():
            mod_name = normalize_path(filepath)
            node_id = f"{mod_name}.{parent}.{name}" if parent else f"{mod_name}.{name}"
            
            clean_endpoint = self._normalize_route(endpoint)
            endpoints.append((clean_endpoint, node_id, endpoint)) # Keep original for display
            
        print(f"🔗 [LINKER] Found {len(endpoints)} API Endpoints (Providers).")

        # 2. Get Consumers
        cursor.execute("SELECT f.filepath, c.caller, c.api_call FROM calls c JOIN files f ON c.file_id = f.id WHERE c.api_call IS NOT NULL")
        consumers = cursor.fetchall()
        print(f"🔗 [LINKER] Found {len(consumers)} API Consumers.")
        
        # 3. Match them up
        match_count = 0
        for filepath, caller, api_call in consumers:
            mod_name = normalize_path(filepath)
            caller_id = f"{mod_name}.{caller}" if caller != "global" else mod_name
            
            clean_call = self._normalize_route(api_call)
            
            for clean_endpoint, target_id, original_endpoint in endpoints:
                # If the normalized structures match exactly
                if clean_call == clean_endpoint or clean_endpoint in clean_call:
                    cursor.execute("INSERT INTO api_edges (caller_node_id, endpoint_node_id, path) VALUES (?, ?, ?)", (caller_id, target_id, original_endpoint))
                    print(f"✅ [MATCH] {caller_id} ➔ {target_id} ({clean_endpoint})")
                    match_count += 1

        print(f"🎯 [LINKER] Successfully created {match_count} Cross-Service API edges.")
        conn.commit()
        conn.close()