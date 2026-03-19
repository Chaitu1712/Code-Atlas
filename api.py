from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pathlib import Path
from typing import  List
import sqlite3
import shutil
import os
import gc
import asyncio
from fastapi.responses import StreamingResponse

from core.models import ProjectRequest, LayoutUpdate, DownloadRequest, ChatRequest
from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService
from core.parser import CodeParser
from core.db import Database
from core.ignore import GitIgnoreChecker
from core.git_helper import get_git_authors
from core.api_linker import APILinker
from core.strategies.path_normalizer import normalize_path
from core.config import get_config, save_config, is_setup_complete
from core.llm import CodeAtlasAI

app = FastAPI(title="Code Atlas API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
embedder_cache = {}
ai_cache = {}

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
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


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
    finally:
        db.conn.close()
    linker = APILinker(str(db_path))
    linker.run_linkage()

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
    db_path = str((DATA_DIR / project_name / "atlas.db").resolve())
    index_path = str((DATA_DIR / project_name / "atlas.index").resolve())
    if not Path(db_path).exists():  raise HTTPException(status_code=404)
    if project_name not in embedder_cache: embedder_cache[project_name] = EmbeddingService(db_path, index_path)
    else: embedder_cache[project_name].__init__(db_path, index_path)
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
            SELECT n.name, n.node_type, n.parent_name, n.start_line, n.end_line, n.code_snippet, f.filepath
            FROM nodes n JOIN files f ON n.file_id = f.id WHERE n.name = ?
        """, (node_name,))
        
        for row in cursor.fetchall():
            name, node_type, parent_name, start_line, end_line, snippet, filepath = row
            mod_name = normalize_path(filepath)
            expected_id = f"{mod_name}.{parent_name}.{name}" if parent_name else f"{mod_name}.{name}"
            
            if expected_id == node_id:
                git_data = get_git_authors(filepath, start_line, end_line)
                return {
                    "id": node_id, "name": name, "type": node_type, "filepath": filepath, 
                    "line_start": start_line, "line_end": end_line, "code": snippet,
                    "git": git_data
                }
    finally:
        conn.close()
        
    return {"id": node_id, "type": "module/package", "message": "No code snippet available."}

@app.get("/api/config")
def read_config():
    return {"config": get_config(), "is_setup_complete": is_setup_complete()}

@app.post("/api/config")
def update_config(new_config: dict):
    current = get_config()
    current.update(new_config)
    save_config(current)
    return {"status": "success"}

@app.post("/api/models/download")
async def download_model_endpoint(req: DownloadRequest, background_tasks: BackgroundTasks):
    def download_task():
        asyncio.run(ws_manager.broadcast({"status": "Downloading Model", "message": f"Downloading {req.filename} from HuggingFace. This may take several minutes...", "percent": 10}))
        try:
            ai = CodeAtlasAI("", "")
            ai.download_model(req.repo_id, req.filename, req.display_name)
            asyncio.run(ws_manager.broadcast({"status": "Complete!", "message": "Model downloaded successfully.", "percent": 100}))
        except Exception as e:
            asyncio.run(ws_manager.broadcast({"status": "Error", "message": str(e), "percent": 0}))

    background_tasks.add_task(download_task)
    return {"status": "download_started"}

@app.delete("/api/models/{filename}")
def delete_local_model(filename: str):
    """Deletes a local model file and removes it from config."""
    config = get_config()
    model = next((m for m in config.get("local_models", []) if m["filename"] == filename), None)
    
    if not model: raise HTTPException(status_code=404, detail="Model not found in config")
    
    path = Path(model["path"])
    if path.exists():
        path.unlink()
        
    config["local_models"] = [m for m in config["local_models"] if m["filename"] != filename]
    
    if config["active_local_model"] == model["path"]:
        config["active_local_model"] = config["local_models"][0]["path"] if config["local_models"] else ""
        
    save_config(config)
    return {"status": "success"}

@app.post("/api/chat/{project_name}")
async def chat_endpoint(project_name: str, req: ChatRequest):
    db_path = str((DATA_DIR / project_name / "atlas.db").resolve())
    project_dir = str((DATA_DIR / project_name).resolve())
    if project_name not in ai_cache:
        ai_cache[project_name] = CodeAtlasAI(db_path, project_dir)
    ai = ai_cache[project_name]
    
    return StreamingResponse(
        ai.stream_chat(req.node_id, req.message, req.selected_model), 
        media_type="text/plain"
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)