# api.py
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import sqlite3
import shutil
import os

from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService
from core.parser import CodeParser
from core.db import Database
from core.ignore import GitIgnoreChecker

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
embedder_cache = {}

# --- NEW: Request Model for UI Parsing ---
class ProjectRequest(BaseModel):
    project_name: str
    directory: str

def get_embedder(project_name: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    index_path = DATA_DIR / project_name / "atlas.index"
    if not db_path.exists(): raise HTTPException(status_code=404, detail="Project not found")
    
    if project_name not in embedder_cache:
        embedder_cache[project_name] = EmbeddingService(str(db_path), str(index_path))
    else:
        embedder_cache[project_name].__init__(str(db_path), str(index_path))
    return embedder_cache[project_name]

@app.get("/api/projects")
def list_projects():
    return [d.name for d in DATA_DIR.iterdir() if d.is_dir()]

@app.delete("/api/projects/{project_name}")
def delete_project(project_name: str):
    project_dir = DATA_DIR / project_name
    if project_dir.exists() and project_dir.is_dir():
        shutil.rmtree(project_dir)
        if project_name in embedder_cache: del embedder_cache[project_name]
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Project not found")

# --- NEW: Parse and Embed Endpoint ---
@app.post("/api/projects")
def add_project(req: ProjectRequest):
    target_dir = Path(req.directory)
    if not target_dir.exists() or not target_dir.is_dir():
        raise HTTPException(status_code=400, detail="Invalid directory path")

    # Setup paths
    project_dir = DATA_DIR / req.project_name
    project_dir.mkdir(parents=True, exist_ok=True)
    db_path = project_dir / "atlas.db"
    index_path = project_dir / "atlas.index"

    # 1. Parse Directory
    if db_path.exists(): os.remove(db_path)
    db = Database(str(db_path))
    parser = CodeParser()
    ignore_checker = GitIgnoreChecker(str(target_dir))
    
    py_files = [f for f in target_dir.rglob("*.py") if not ignore_checker.is_ignored(f)]
    for file in py_files:
        try:
            db.save_module(parser.parse_file(str(file)))
        except Exception as e:
            print(f"Skipped {file}: {e}")

    # 2. Generate Embeddings
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    embedder = EmbeddingService(str(db_path), str(index_path))
    embedder.generate_embeddings()

    return {"status": "success", "files_parsed": len(py_files)}

# (Keep your existing /api/graph, /api/search, and /api/node endpoints exactly the same below this)
@app.get("/api/graph/{project_name}")
def get_graph(project_name: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    if not db_path.exists(): raise HTTPException(status_code=404)
    analyzer = GraphAnalyzer(str(db_path))
    analyzer.build_module_graph()
    return analyzer.export_json()

@app.get("/api/search/{project_name}")
def search_codebase(project_name: str, q: str = Query(...)):
    embedder = get_embedder(project_name)
    return {"query": q, "results": embedder.search(q, top_k=5)}

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
        if filepath.replace(".py", "").replace("\\", ".").replace("/", ".") in node_id:
            return {"id": node_id, "name": name, "type": node_type, "filepath": filepath, "line_start": start_line, "line_end": end_line, "code": snippet}
    return {"id": node_id, "type": "module/package", "message": "No code snippet available."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)