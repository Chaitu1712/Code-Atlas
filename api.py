# api.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService
import sqlite3

app = FastAPI(title="Code Atlas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embedder = EmbeddingService()

@app.get("/api/graph")
def get_graph():
    """Returns the D3-compatible dependency graph."""
    analyzer = GraphAnalyzer()
    analyzer.build_module_graph()
    return analyzer.export_json()

@app.get("/api/search")
def search_codebase(q: str = Query(..., description="Natural language search query")):
    """Searches the codebase and returns top nodes."""
    results = embedder.search(q, top_k=5)
    return {"query": q, "results": results}

@app.get("/api/node/{node_id:path}")
def get_node_details(node_id: str):
    """Fetches the code snippet and metadata for a given node ID."""
    node_name = node_id.split('.')[-1]
    
    conn = sqlite3.connect("atlas.db")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT n.name, n.node_type, n.start_line, n.end_line, n.code_snippet, f.filepath
        FROM nodes n
        JOIN files f ON n.file_id = f.id
        WHERE n.name = ?
    """, (node_name,))
    
    rows = cursor.fetchall()
    for row in rows:
        name, node_type, start_line, end_line, snippet, filepath = row
        file_module = filepath.replace(".py", "").replace("\\", ".").replace("/", ".")
        if file_module in node_id:
            return {
                "id": node_id,
                "name": name,
                "type": node_type,
                "filepath": filepath,
                "line_start": start_line,
                "line_end": end_line,
                "code": snippet
            }
            
    return {"id": node_id, "type": "module/package", "message": "No code snippet available for this node type."}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting API server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)