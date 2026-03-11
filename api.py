from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
from typing import Optional, List
import sqlite3
import shutil
import os
import gc
import asyncio

from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService
from core.parser import CodeParser
from core.db import Database
from core.ignore import GitIgnoreChecker
from core.git_helper import get_git_authors
from core.api_linker import APILinker

app = FastAPI(title="Code Atlas API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
embedder_cache = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()

@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

class ProjectRequest(BaseModel):
    project_name: str
    directory: str

class LayoutUpdate(BaseModel):
    node_id: str
    fx: Optional[float]
    fy: Optional[float]

@app.post("/api/projects")
async def add_project(req: ProjectRequest):
    target_dir = Path(req.directory)
    if not target_dir.exists() or not target_dir.is_dir():
        raise HTTPException(status_code=400, detail="Invalid directory path")

    project_dir = DATA_DIR / req.project_name
    project_dir.mkdir(parents=True, exist_ok=True)
    db_path = project_dir / "atlas.db"
    index_path = project_dir / "atlas.index"

    if db_path.exists(): os.remove(db_path)
    db = Database(str(db_path))
    parser = CodeParser()
    ignore_checker = GitIgnoreChecker(str(target_dir))
    
    py_files = []
    valid_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx'}
    for root, dirs, files in os.walk(target_dir):
        root_path = Path(root)
        try:
            rel_root = str(root_path.relative_to(target_dir))
        except ValueError:
            rel_root = ""

        for i in range(len(dirs) - 1, -1, -1):
            d = dirs[i]
            if ignore_checker.is_ignored(d, os.path.join(rel_root, d)):
                del dirs[i]
                
        for f in files:
            file_path = root_path / f
            if file_path.suffix in valid_extensions:
                if not ignore_checker.is_ignored(f, os.path.join(rel_root, f)):
                    py_files.append(file_path)

    total_files = len(py_files)
    
    try:
        for i, file in enumerate(py_files, 1):
            await ws_manager.broadcast({
                "status": "Parsing AST...", 
                "message": f"File {i} of {total_files}: {file.name}",
                "percent": int((i / total_files) * 60)
            })
            
            try:
                db.save_module(parser.parse_file(str(file)))
            except Exception:
                pass
            await asyncio.sleep(0.01) 
        linker = APILinker(str(db_path))
        linker.run_linkage()
    finally:
        db.conn.close()

    await ws_manager.broadcast({"status": "AI Engine", "message": "Warming up local AI model...", "percent": 65})
    await asyncio.sleep(0.5)

    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    embedder = EmbeddingService(str(db_path), str(index_path))
    
    await ws_manager.broadcast({"status": "Vectorizing...", "message": "Generating semantic embeddings...", "percent": 80})
    await asyncio.to_thread(embedder.generate_embeddings)

    gc.collect()
    await ws_manager.broadcast({"status": "Complete!", "message": "Project is ready.", "percent": 100})
    return {"status": "success", "files_parsed": len(py_files)}

@app.post("/api/graph/{project_name}/layout")
def save_layout(project_name: str, updates: List[LayoutUpdate]):
    db_path = DATA_DIR / project_name / "atlas.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    for u in updates:
        if u.fx is None or u.fy is None:
            cursor.execute("DELETE FROM layout WHERE node_id = ?", (u.node_id,))
        else:
            cursor.execute("INSERT OR REPLACE INTO layout (node_id, fx, fy) VALUES (?, ?, ?)", (u.node_id, u.fx, u.fy))
            
    conn.commit()
    conn.close()
    return {"status": "success"}

def get_embedder(project_name: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    index_path = DATA_DIR / project_name / "atlas.index"
    if not db_path.exists(): raise HTTPException(status_code=404)
    if project_name not in embedder_cache: embedder_cache[project_name] = EmbeddingService(str(db_path), str(index_path))
    else: embedder_cache[project_name].__init__(str(db_path), str(index_path))
    return embedder_cache[project_name]

@app.get("/api/projects")
def list_projects(): return [d.name for d in DATA_DIR.iterdir() if d.is_dir()]

@app.delete("/api/projects/{project_name}")
def delete_project(project_name: str):
    project_dir = DATA_DIR / project_name
    if project_name in embedder_cache: del embedder_cache[project_name]
    gc.collect()
    if project_dir.exists() and project_dir.is_dir():
        try: shutil.rmtree(project_dir); return {"status": "success"}
        except PermissionError: raise HTTPException(status_code=409, detail="File locked. Try again.")
    raise HTTPException(status_code=404)

@app.get("/api/graph/{project_name}")
def get_graph(project_name: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    if not db_path.exists(): raise HTTPException(status_code=404)
    analyzer = GraphAnalyzer(str(db_path))
    try: 
        analyzer.build_module_graph();
        graph_data = analyzer.export_json()
        cycles = analyzer.get_cyclic_dependencies()
        valid_cycles = [c for c in cycles if len(c) > 1]
        return {
            "graph": graph_data,
            "cycles": valid_cycles
        }
    finally: 
        analyzer.conn.close()

@app.get("/api/search/{project_name}")
def search_codebase(project_name: str, q: str = Query(...)):
    embedder = get_embedder(project_name); res = embedder.search(q, top_k=5); gc.collect(); return {"query": q, "results": res}

@app.get("/api/node/{project_name}/{node_id:path}")
def get_node_details(project_name: str, node_id: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    node_name = node_id.split('.')[-1]
    
    conn = sqlite3.connect(str(db_path))
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT n.name, n.node_type, n.start_line, n.end_line, n.code_snippet, f.filepath
            FROM nodes n JOIN files f ON n.file_id = f.id WHERE n.name = ?
        """, (node_name,))
        
        for row in cursor.fetchall():
            name, node_type, start_line, end_line, snippet, filepath = row
            if filepath.replace(".py", "").replace("\\", ".").replace("/", ".") in node_id:
                
                git_data = get_git_authors(filepath, start_line, end_line)
                return {
                    "id": node_id, "name": name, "type": node_type, "filepath": filepath, 
                    "line_start": start_line, "line_end": end_line, "code": snippet,
                    "git": git_data
                }
    finally:
        conn.close()
        
    return {"id": node_id, "type": "module/package", "message": "No code snippet available."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)