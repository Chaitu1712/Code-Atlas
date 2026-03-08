from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService
from pathlib import Path
import sqlite3
import shutil

app = FastAPI(title="Code Atlas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

# Cache embedder instances so we don't reload the AI model repeatedly
embedder_cache = {}

def get_embedder(project_name: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    index_path = DATA_DIR / project_name / "atlas.index"
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_name not in embedder_cache:
        embedder_cache[project_name] = EmbeddingService(str(db_path), str(index_path))
    else:
        # Reload index in case it was updated via CLI
        embedder_cache[project_name].__init__(str(db_path), str(index_path))
        
    return embedder_cache[project_name]

@app.get("/api/projects")
def list_projects():
    """Returns a list of all parsed projects."""
    return [d.name for d in DATA_DIR.iterdir() if d.is_dir()]

@app.delete("/api/projects/{project_name}")
def delete_project(project_name: str):
    """Deletes a project folder entirely."""
    project_dir = DATA_DIR / project_name
    if project_dir.exists() and project_dir.is_dir():
        shutil.rmtree(project_dir)
        if project_name in embedder_cache:
            del embedder_cache[project_name]
        return {"status": "success", "message": f"Deleted {project_name}"}
    raise HTTPException(status_code=404, detail="Project not found")

@app.get("/api/graph/{project_name}")
def get_graph(project_name: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    if not db_path.exists():
        raise HTTPException(status_code=404, detail="Project DB not found")
        
    analyzer = GraphAnalyzer(str(db_path))
    analyzer.build_module_graph()
    return analyzer.export_json()

@app.get("/api/search/{project_name}")
def search_codebase(project_name: str, q: str = Query(...)):
    embedder = get_embedder(project_name)
    results = embedder.search(q, top_k=5)
    return {"query": q, "results": results}

@app.get("/api/node/{project_name}/{node_id:path}")
def get_node_details(project_name: str, node_id: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    node_name = node_id.split('.')[-1]
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    cursor.execute("""
        SELECT n.name, n.node_type, n.start_line, n.end_line, n.code_snippet, f.filepath
        FROM nodes n JOIN files f ON n.file_id = f.id WHERE n.name = ?
    """, (node_name,))
    
    for row in cursor.fetchall():
        name, node_type, start_line, end_line, snippet, filepath = row
        file_module = filepath.replace(".py", "").replace("\\", ".").replace("/", ".")
        if file_module in node_id:
            return {
                "id": node_id, "name": name, "type": node_type, "filepath": filepath,
                "line_start": start_line, "line_end": end_line, "code": snippet
            }
            
    return {"id": node_id, "type": "module/package", "message": "No code snippet available."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)