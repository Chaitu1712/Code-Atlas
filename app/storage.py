import faiss
import numpy as np
import json, os
from embedder import embed_code

INDEX_PATH = "data/codeatlas.index"
IDMAP_PATH = "data/id_map.json"
PARSED_PATH = "data/parsed_embedded.json"

def build_faiss_index(parsed_json, dim):
    index = faiss.IndexFlatL2(dim)
    id_map = []

    vectors = []
    for el in parsed_json["elements"]:
        if "embedding" in el and el["embedding"]:
            vectors.append(el["embedding"])
            id_map.append(el["id"])

    vectors = np.array(vectors).astype("float32")
    index.add(vectors)

    faiss.write_index(index, INDEX_PATH)
    with open(IDMAP_PATH, "w", encoding="utf-8") as f:
        json.dump(id_map, f, indent=2)

    print(f"✅ Built FAISS index with {len(id_map)} vectors")

def load_faiss_index():
    index = faiss.read_index(INDEX_PATH)
    with open(IDMAP_PATH, "r", encoding="utf-8") as f:
        id_map = json.load(f)
    with open(PARSED_PATH, "r", encoding="utf-8") as f:
        parsed = json.load(f)
    id_to_element = {el["id"]: el for el in parsed["elements"]}
    return index, id_map, id_to_element

def search_codebase(query: str, top_k=5):
    index, id_map, id_to_element = load_faiss_index()
    q_vec = np.array([embed_code(query)], dtype="float32")
    D, I = index.search(q_vec, top_k)

    results = []
    for dist, idx in zip(D[0], I[0]):
        if idx < len(id_map):
            el_id = id_map[idx]
            el = id_to_element[el_id]
            results.append({
                "id": el_id,
                "score": float(dist),
                "file": el.get("file"),
                "type": el.get("type"),
                "name": el.get("name"),
                "code": el.get("code"),
            })
    return results
