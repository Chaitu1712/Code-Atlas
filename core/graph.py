import sqlite3
import json

def generate_dependency_graph(db_path: str = "atlas.db") -> dict:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all parsed files
    cursor.execute("SELECT id, filepath FROM files")
    files = {row[0]: row[1] for row in cursor.fetchall()}

    nodes =[]
    edges =[]

    # Create a node for every file
    for file_id, filepath in files.items():
        nodes.append({
            "id": filepath,
            "type": "file"
        })

    # Get all dependencies (file A imports module B)
    cursor.execute("SELECT file_id, imported_module FROM imports")
    for file_id, imported_module in cursor.fetchall():
        source_file = files[file_id]
        
        # We also create phantom nodes for external libraries (like 'os' or 'fastapi')
        if not any(n["id"] == imported_module for n in nodes):
            nodes.append({
                "id": imported_module,
                "type": "module_external"
            })

        edges.append({
            "source": source_file,
            "target": imported_module
        })

    return {"nodes": nodes, "edges": edges}