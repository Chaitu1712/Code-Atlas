from fastapi import FastAPI, Query
from pydantic import BaseModel
from typing import List, Dict, Any
from app.search import semantic_search
from app.main import build_pipeline, clone_repo
app = FastAPI(title="Code Atlas API")

class SearchResult(BaseModel):
    id: str
    metadata: Dict[str, Any]

@app.get("/search")
def search_code(q: str = Query(..., description="Natural language query"), k: int = 3):
    results = semantic_search(q, top_k=k)
    return results
@app.post("/parse")
def parse_repository():
    try:
        build_pipeline()
        return {"status": "success", "message": f"Repository {repo_name} parsed and indexed."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
@app.post("/clone")
def clone_repository(github_url: str = Query(...)):
    try:
        repo_name = "repo"
        local_path = clone_repo(github_url, repo_name)
        build_pipeline()
        return {"status": "success", "message": f"Repository cloned to {local_path}, parsed and indexed", "path": local_path}
    except Exception as e:
        return {"status": "error", "message": str(e)}
@app.get("/")
def read_root():
    return {"message": "Welcome to the Code Atlas API. Use /search endpoint to perform semantic code search."}
