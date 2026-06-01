import os
import gc
import shutil
import sqlite3
import asyncio
import subprocess
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Internal Core Modules
from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService
from core.parser import CodeParser
from core.db import Database
from core.ignore import GitIgnoreChecker
from core.api_linker import APILinker
from core.config import get_config, save_config, is_setup_complete
from core.llm import CodeAtlasAI
from core.strategies.path_normalizer import normalize_path
from core.git_helper import get_git_authors

# --- APP SETUP ---
app = FastAPI(title="Code Atlas Cloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path("data").resolve()
DATA_DIR.mkdir(exist_ok=True)

# Memory Caches
embedder_cache = {}
ai_cache = {}

# --- WEBSOCKET MANAGER ---
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

# --- CONFIG ENDPOINTS ---
@app.get("/api/config")
def read_config():
    return {"config": get_config(), "is_setup_complete": is_setup_complete()}

@app.post("/api/config")
def update_config(new_config: dict):
    current = get_config()
    current.update(new_config)
    save_config(current)
    return {"status": "success"}

# --- GITHUB AUTO-INGESTION ---
class GithubRequest(BaseModel):
    github_url: str

@app.post("/api/projects/github")
async def add_github_project(req: GithubRequest, background_tasks: BackgroundTasks):
    def process_github_repo():
        # 1. Setup paths
        repo_name = req.github_url.rstrip('/').split('/')[-1].replace('.git', '')
        project_dir = DATA_DIR / repo_name
        
        asyncio.run(ws_manager.broadcast({
            "status": "Cloning...", 
            "message": f"Cloning {repo_name} from GitHub...", 
            "percent": 5
        }))
        
        # Determine OS-agnostic temp directory
        temp_base = Path("C:/tmp") if os.name == 'nt' else Path("/tmp")
        clone_dir = temp_base / repo_name
        
        if clone_dir.exists():
            shutil.rmtree(clone_dir)
            
        # Clone repository shallowly to save massive amounts of time and disk space
        try:
            subprocess.run(["git", "clone", "--depth", "1", req.github_url, str(clone_dir)], check=True)
        except subprocess.CalledProcessError as e:
            asyncio.run(ws_manager.broadcast({"status": "Error", "message": f"Git Clone Failed: {e}", "percent": 0}))
            return
            
        project_dir.mkdir(parents=True, exist_ok=True)
        db_path = project_dir / "atlas.db"
        index_path = project_dir / "atlas.index"
        
        if db_path.exists(): 
            os.remove(db_path)
            
        db = Database(str(db_path))
        parser = CodeParser()
        ignore_checker = GitIgnoreChecker(str(clone_dir))
        
        # 2. Pruning Walk
        py_files = []
        valid_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx'}
        
        for root, dirs, files in os.walk(clone_dir):
            root_path = Path(root)
            try:
                rel_root = str(root_path.relative_to(clone_dir))
            except ValueError:
                rel_root = ""

            # Prune ignored directories in-place
            for i in range(len(dirs) - 1, -1, -1):
                if ignore_checker.is_ignored(dirs[i], os.path.join(rel_root, dirs[i])): 
                    del dirs[i]
                    
            for f in files:
                file_path = root_path / f
                if file_path.suffix in valid_extensions and not ignore_checker.is_ignored(f, os.path.join(rel_root, f)):
                    py_files.append(file_path)

        # 3. Parse AST
        total = len(py_files)
        if total == 0:
            asyncio.run(ws_manager.broadcast({"status": "Error", "message": "No valid source files found.", "percent": 0}))
            db.conn.close()
            shutil.rmtree(clone_dir)
            return

        try:
            for i, file in enumerate(py_files, 1):
                asyncio.run(ws_manager.broadcast({
                    "status": "Parsing AST...", 
                    "message": f"File {i} of {total}: {file.name}", 
                    "percent": int(10 + (i/total)*40) # Scales from 10% to 50%
                }))
                try: 
                    db.save_module(parser.parse_file(str(file)))
                except Exception:
                    pass
        finally:
            db.conn.close()

        # 4. Cross-Language API Linker
        asyncio.run(ws_manager.broadcast({"status": "Linking APIs...", "message": "Detecting cross-language endpoints...", "percent": 60}))
        linker = APILinker(str(db_path))
        linker.run_linkage()

        # 5. Generate Semantic Embeddings
        asyncio.run(ws_manager.broadcast({"status": "Vectorizing...", "message": "Generating AI embeddings...", "percent": 75}))
        os.environ["TOKENIZERS_PARALLELISM"] = "false"
        embedder = EmbeddingService(str(db_path), str(index_path))
        embedder.generate_embeddings()
        
        # 6. Cleanup to save cloud disk space
        asyncio.run(ws_manager.broadcast({"status": "Cleaning up...", "message": "Removing raw source files...", "percent": 95}))
        shutil.rmtree(clone_dir, ignore_errors=True)
        gc.collect()

        asyncio.run(ws_manager.broadcast({"status": "Complete!", "message": "Project is ready.", "percent": 100}))

    # Run the entire pipeline in the background so HTTP request completes instantly
    background_tasks.add_task(process_github_repo)
    return {"status": "started"}

# --- PROJECT MANAGEMENT ENDPOINTS ---
@app.get("/api/projects")
def list_projects():
    return [d.name for d in DATA_DIR.iterdir() if d.is_dir()]

@app.delete("/api/projects/{project_name}")
def delete_project(project_name: str):
    project_dir = DATA_DIR / project_name
    
    # Invalidate Caches
    if project_name in embedder_cache:
        del embedder_cache[project_name]
    if project_name in ai_cache:
        del ai_cache[project_name]
        
    gc.collect() # Force close SQLite handles

    if project_dir.exists() and project_dir.is_dir():
        try:
            shutil.rmtree(project_dir)
            return {"status": "success", "message": f"Deleted {project_name}"}
        except PermissionError:
            raise HTTPException(status_code=409, detail="Files are locked by OS. Try again.")
            
    raise HTTPException(status_code=404, detail="Project not found")

# --- GRAPH & LAYOUT ENDPOINTS ---
@app.get("/api/graph/{project_name}")
def get_graph(project_name: str):
    db_path = DATA_DIR / project_name / "atlas.db"
    if not db_path.exists(): 
        raise HTTPException(status_code=404, detail="Project DB not found")
        
    analyzer = GraphAnalyzer(str(db_path))
    try:
        analyzer.build_module_graph()
        graph_data = analyzer.export_json()
        cycles = analyzer.get_cyclic_dependencies()
        valid_cycles = [c for c in cycles if len(c) > 1]
        
        return {
            "graph": graph_data,
            "cycles": valid_cycles
        }
    finally:
        analyzer.conn.close()

class LayoutUpdate(BaseModel):
    node_id: str
    fx: Optional[float]
    fy: Optional[float]

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

# --- SEARCH & NODE DETAILS ---
def get_embedder(project_name: str):
    db_path = str((DATA_DIR / project_name / "atlas.db").resolve())
    index_path = str((DATA_DIR / project_name / "atlas.index").resolve())
    if not Path(db_path).exists(): 
        raise HTTPException(status_code=404, detail="Project not found")
    
    if project_name not in embedder_cache:
        embedder_cache[project_name] = EmbeddingService(db_path, index_path)
    else:
        embedder_cache[project_name].__init__(db_path, index_path)
    return embedder_cache[project_name]

@app.get("/api/search/{project_name}")
def search_codebase(project_name: str, q: str = Query(...)):
    embedder = get_embedder(project_name)
    results = embedder.search(q, top_k=5)
    gc.collect()
    return {"query": q, "results": results}

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
            
            # Match exact global ID
            mod_name = normalize_path(filepath)
            expected_id = f"{mod_name}.{parent_name}.{name}" if parent_name else f"{mod_name}.{name}"
            
            if expected_id == node_id:
                # Attempt to get Git Authorship (Will fail gracefully if repo was deleted to save space)
                git_data = get_git_authors(filepath, start_line, end_line)
                
                return {
                    "id": node_id, "name": name, "type": node_type, "filepath": filepath, 
                    "line_start": start_line, "line_end": end_line, "code": snippet,
                    "git": git_data
                }
    finally:
        conn.close()
        
    return {"id": node_id, "type": "module/package", "message": "No code snippet available for this node."}

# --- CLOUD-ONLY CHAT ENDPOINT ---
class ChatRequest(BaseModel):
    node_id: str
    message: str
    selected_model: str

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

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)