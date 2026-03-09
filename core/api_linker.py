import sqlite3

class APILinker:
    def __init__(self, db_path: str):
        self.db_path = db_path

    def run_linkage(self):
        """Finds frontend API consumers and links them to backend endpoints."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM api_edges")

        cursor.execute("""
            SELECT f.filepath, n.parent_name, n.name, n.api_endpoint 
            FROM nodes n JOIN files f ON n.file_id = f.id 
            WHERE n.api_endpoint IS NOT NULL
        """)
        endpoints = []
        for filepath, parent, name, endpoint in cursor.fetchall():
            mod_name = filepath.replace(".py", "").replace("\\", ".").replace("/", ".")
            node_id = f"{mod_name}.{parent}.{name}" if parent else f"{mod_name}.{name}"
            endpoints.append((endpoint, node_id))

        if not endpoints:
            conn.close()
            return

        cursor.execute("""
            SELECT f.filepath, c.caller, c.api_call 
            FROM calls c JOIN files f ON n.file_id = f.id 
            WHERE c.api_call IS NOT NULL
        """)

        for filepath, caller, api_call in cursor.fetchall():
            mod_name = filepath.replace(".ts", "").replace(".js", "").replace("\\", ".").replace("/", ".")
            caller_id = f"{mod_name}.{caller}" if caller != "global" else mod_name
            
            for endpoint, target_id in endpoints:
                if api_call == endpoint:
                    cursor.execute("""
                        INSERT INTO api_edges (caller_node_id, endpoint_node_id, path)
                        VALUES (?, ?, ?)
                    """, (caller_id, target_id, endpoint))

        conn.commit()
        conn.close()