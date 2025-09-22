from storage import build_faiss_index
from parser import parse_codebase
from embedder import embed_code
import json, os, shutil, stat
from git import Repo

REPO_DIR = "repos"
OUTPUT_PATH = "data/parsed_embedded.json"

def handle_remove_readonly(func, path, exc_info):
    """Clear the readonly bit and reattempt removal."""
    os.chmod(path, stat.S_IWRITE)
    func(path)

def clone_repo(github_url: str, repo_name: str) -> str:
    """Clone a GitHub repo into REPO_DIR and return its local path."""
    repo_path = os.path.join(REPO_DIR, repo_name)
    if os.path.exists(repo_path):
        print(f"Removing old repo at {repo_path}")
        shutil.rmtree(repo_path, onerror=handle_remove_readonly)

    os.makedirs(REPO_DIR, exist_ok=True)
    print(f"Cloning {github_url} → {repo_path}")
    Repo.clone_from(github_url, repo_path)
    return repo_path

def build_pipeline(output_path: str = OUTPUT_PATH):
    repo_path="repos/repo"
    parsed = parse_codebase(repo_path)

    for el in parsed["elements"]:
        try:
            el["embedding"] = embed_code(el["code"])
        except Exception as e:
            print(f"[WARN] Failed to embed {el['id']}: {e}")
            el["embedding"] = []

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save parsed + embedded JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2)

    print(f"Parsed {len(parsed['elements'])} elements → {output_path}")

    #Build FAISS index
    valid_embeddings = [el["embedding"] for el in parsed["elements"] if el["embedding"]]
    if not valid_embeddings:
        raise RuntimeError("No valid embeddings were generated. Cannot build index.")

    dim = len(valid_embeddings[0])
    build_faiss_index(parsed, dim)

def main():
    github_url = "https://github.com/fastapi/fastapi.git"
    repo_name = "repo"
    clone_repo(github_url, repo_name)
    build_pipeline()

if __name__ == "__main__":
    main()
