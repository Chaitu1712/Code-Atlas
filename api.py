import os
import gc
import shutil
import sqlite3
import asyncio
import subprocess
import uvicorn
from pathlib import Path
from typing import List, Optional

import jwt
from fastapi import FastAPI, Query, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

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
from core.models import ChatRequest, AuthRequest, PasswordChangeRequest, LayoutUpdate, GithubRequest
# Auth Modules
from core.auth import hash_password, verify_password, create_access_token, get_current_user, SECRET_KEY, ALGORITHM

# --- APP SETUP ---
app = FastAPI(title="Code Atlas Cloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change this to your Vercel URL in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path("data").resolve()
DATA_DIR.mkdir(exist_ok=True)

# --- USERS DATABASE INITIALIZATION ---
USERS_DB = DATA_DIR / "users.db"
def init_users_db():
    conn = sqlite3.connect(str(USERS_DB))
    conn.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password_hash TEXT)")
    conn.commit()
    conn.close()
init_users_db()

# Memory Caches
embedder_cache = {}
ai_cache = {}

def get_user_projects_dir(username: str) -> Path:
    d = DATA_DIR / "users" / username / "projects"
    d.mkdir(parents=True, exist_ok=True)
    return d

# --- WEBSOCKET MANAGER (USER ISOLATED) ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept()
        if username not in self.active_connections:
            self.active_connections[username] = []
        self.active_connections[username].append(websocket)

    def disconnect(self, websocket: WebSocket, username: str):
        if username in self.active_connections and websocket in self.active_connections[username]:
            self.active_connections[username].remove(websocket)

    async def send_personal_message(self, message: dict, username: str):
        if username in self.active_connections:
            for connection in self.active_connections[username]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

ws_manager = ConnectionManager()

@app.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise Exception()
    except Exception:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(websocket, username)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, username)


# --- AUTH ENDPOINTS ---
@app.post("/api/register")
def register_user(req: AuthRequest):
    conn = sqlite3.connect(str(USERS_DB))
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT username FROM users WHERE username = ?", (req.username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Username already exists")
            
        cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", 
                       (req.username, hash_password(req.password)))
        conn.commit()
        return {"status": "success", "message": "User registered successfully"}
    finally:
        conn.close()

@app.post("/api/login")
def login_user(req: AuthRequest):
    conn = sqlite3.connect(str(USERS_DB))
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password_hash FROM users WHERE username = ?", (req.username,))
        row = cursor.fetchone()
        if not row or not verify_password(req.password, row[0]):
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        token = create_access_token({"sub": req.username})
        return {"access_token": token, "token_type": "bearer"}
    finally:
        conn.close()

@app.post("/api/change-password")
def change_password(req: PasswordChangeRequest, current_user: str = Depends(get_current_user)):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        
    conn = sqlite3.connect(str(USERS_DB))
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET password_hash = ? WHERE username = ?", 
                       (hash_password(req.new_password), current_user))
        conn.commit()
        return {"status": "success", "message": "Password updated successfully."}
    finally:
        conn.close()


# --- CONFIG ENDPOINTS ---
@app.get("/api/config")
def read_config(current_user: str = Depends(get_current_user)):
    return {"config": get_config(current_user), "is_setup_complete": is_setup_complete(current_user)}

@app.post("/api/config")
def update_config(new_config: dict, current_user: str = Depends(get_current_user)):
    current = get_config(current_user)
    current.update(new_config)
    save_config(current_user, current)
    return {"status": "success"}


# --- GITHUB AUTO-INGESTION ---

@app.post("/api/projects/github")
async def add_github_project(req: GithubRequest, background_tasks: BackgroundTasks, current_user: str = Depends(get_current_user)):
    def process_github_repo(username: str):
        repo_name = req.github_url.rstrip('/').split('/')[-1].replace('.git', '')
        user_projects_dir = get_user_projects_dir(username)
        project_dir = user_projects_dir / repo_name
        
        asyncio.run(ws_manager.send_personal_message({
            "status": "Cloning...", 
            "message": f"Cloning {repo_name} from GitHub...", 
            "percent": 5
        }, username))
        
        temp_base = Path("C:/tmp") if os.name == 'nt' else Path("/tmp")
        clone_dir = temp_base / f"{username}_{repo_name}"
        
        if clone_dir.exists():
            shutil.rmtree(clone_dir)
            
        try:
            subprocess.run(["git", "clone", "--depth", "1", req.github_url, str(clone_dir)], check=True)
        except subprocess.CalledProcessError as e:
            asyncio.run(ws_manager.send_personal_message({"status": "Error", "message": f"Git Clone Failed: {e}", "percent": 0}, username))
            return
            
        project_dir.mkdir(parents=True, exist_ok=True)
        db_path = project_dir / "atlas.db"
        index_path = project_dir / "atlas.index"
        
        if db_path.exists(): 
            os.remove(db_path)
            
        db = Database(str(db_path))
        parser = CodeParser()
        ignore_checker = GitIgnoreChecker(str(clone_dir))
        
        py_files = []
        valid_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx'}
        
        for root, dirs, files in os.walk(clone_dir):
            root_path = Path(root)
            try: rel_root = str(root_path.relative_to(clone_dir))
            except ValueError: rel_root = ""

            for i in range(len(dirs) - 1, -1, -1):
                if ignore_checker.is_ignored(dirs[i], os.path.join(rel_root, dirs[i])): 
                    del dirs[i]
                    
            for f in files:
                file_path = root_path / f
                if file_path.suffix in valid_extensions and not ignore_checker.is_ignored(f, os.path.join(rel_root, f)):
                    py_files.append(file_path)

        total = len(py_files)
        if total == 0:
            asyncio.run(ws_manager.send_personal_message({"status": "Error", "message": "No valid source files found.", "percent": 0}, username))
            db.conn.close()
            shutil.rmtree(clone_dir, ignore_errors=True)
            return

        try:
            for i, file in enumerate(py_files, 1):
                asyncio.run(ws_manager.send_personal_message({
                    "status": "Parsing AST...", 
                    "message": f"File {i} of {total}: {file.name}", 
                    "percent": int(10 + (i/total)*40)
                }, username))
                try: 
                    db.save_module(parser.parse_file(str(file)))
                except Exception:
                    pass
        finally:
            db.conn.close()

        asyncio.run(ws_manager.send_personal_message({"status": "Linking APIs...", "message": "Detecting cross-language endpoints...", "percent": 60}, username))
        linker = APILinker(str(db_path))
        linker.run_linkage()

        asyncio.run(ws_manager.send_personal_message({"status": "Vectorizing...", "message": "Generating AI embeddings...", "percent": 75}, username))
        os.environ["TOKENIZERS_PARALLELISM"] = "false"
        embedder = EmbeddingService(str(db_path), str(index_path))
        embedder.generate_embeddings()
        
        asyncio.run(ws_manager.send_personal_message({"status": "Cleaning up...", "message": "Removing raw source files...", "percent": 95}, username))
        shutil.rmtree(clone_dir, ignore_errors=True)
        gc.collect()

        asyncio.run(ws_manager.send_personal_message({"status": "Complete!", "message": "Project is ready.", "percent": 100}, username))

    background_tasks.add_task(process_github_repo, current_user)
    return {"status": "started"}


# --- PROJECT MANAGEMENT ENDPOINTS ---
@app.get("/api/projects")
def list_projects(current_user: str = Depends(get_current_user)):
    user_projects_dir = get_user_projects_dir(current_user)
    return [d.name for d in user_projects_dir.iterdir() if d.is_dir()]

@app.delete("/api/projects/{project_name}")
def delete_project(project_name: str, current_user: str = Depends(get_current_user)):
    user_projects_dir = get_user_projects_dir(current_user)
    project_dir = user_projects_dir / project_name
    
    cache_key = f"{current_user}_{project_name}"
    if cache_key in embedder_cache:
        del embedder_cache[cache_key]
    if cache_key in ai_cache:
        del ai_cache[cache_key]
        
    gc.collect() 

    if project_dir.exists() and project_dir.is_dir():
        try:
            shutil.rmtree(project_dir)
            return {"status": "success", "message": f"Deleted {project_name}"}
        except PermissionError:
            raise HTTPException(status_code=409, detail="Files are locked by OS. Try again.")
            
    raise HTTPException(status_code=404, detail="Project not found")


# --- GRAPH & LAYOUT ENDPOINTS ---
@app.get("/api/graph/{project_name}")
def get_graph(project_name: str, current_user: str = Depends(get_current_user)):
    db_path = get_user_projects_dir(current_user) / project_name / "atlas.db"
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

@app.post("/api/graph/{project_name}/layout")
def save_layout(project_name: str, updates: List[LayoutUpdate], current_user: str = Depends(get_current_user)):
    db_path = get_user_projects_dir(current_user) / project_name / "atlas.db"
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
def get_embedder(project_name: str, username: str):
    db_path = str((get_user_projects_dir(username) / project_name / "atlas.db").resolve())
    index_path = str((get_user_projects_dir(username) / project_name / "atlas.index").resolve())
    
    if not Path(db_path).exists(): 
        raise HTTPException(status_code=404, detail="Project not found")
    
    cache_key = f"{username}_{project_name}"
    if cache_key not in embedder_cache:
        embedder_cache[cache_key] = EmbeddingService(db_path, index_path)
    else:
        embedder_cache[cache_key].__init__(db_path, index_path)
    return embedder_cache[cache_key]

@app.get("/api/search/{project_name}")
def search_codebase(project_name: str, q: str = Query(...), current_user: str = Depends(get_current_user)):
    embedder = get_embedder(project_name, current_user)
    results = embedder.search(q, top_k=5)
    gc.collect()
    return {"query": q, "results": results}

@app.get("/api/node/{project_name}/{node_id:path}")
def get_node_details(project_name: str, node_id: str, current_user: str = Depends(get_current_user)):
    db_path = get_user_projects_dir(current_user) / project_name / "atlas.db"
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
        
    return {"id": node_id, "type": "module/package", "message": "No code snippet available for this node."}


# --- CLOUD-ONLY CHAT ENDPOINT ---

@app.post("/api/chat/{project_name}")
async def chat_endpoint(project_name: str, req: ChatRequest, current_user: str = Depends(get_current_user)):
    db_path = str((get_user_projects_dir(current_user) / project_name / "atlas.db").resolve())
    project_dir = str((get_user_projects_dir(current_user) / project_name).resolve()) 
    
    cache_key = f"{current_user}_{project_name}"
    if cache_key not in ai_cache:
        ai_cache[cache_key] = CodeAtlasAI(db_path, project_dir, current_user)
    
    ai = ai_cache[cache_key]
    return StreamingResponse(
        ai.stream_chat(req.node_id, req.message, req.selected_model), 
        media_type="text/plain"
    )
    
if __name__ == "__main__":
     uvicorn.run(app, host="0.0.0.0", port=8000)