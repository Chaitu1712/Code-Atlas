# api.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService

app = FastAPI(title="Code Atlas API")

# Allow React to fetch data from our API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open for local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load embedder once so it stays in memory (fast queries!)
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

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting API server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)