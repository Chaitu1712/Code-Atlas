import numpy as np
from app.embedder import embed_code
from app.summarizer import summarize_code
from app.storage import load_faiss_index

def semantic_search(query: str, top_k: int = 3):
    """
    Two-pass semantic search:
    1. Retrieve top-K by raw code embeddings (FAISS).
    2. Summarize retrieved code, embed summaries.
    3. Re-rank with query embedding vs summary embeddings.
    """
    index, id_map, id_to_element = load_faiss_index()
    q_vec = np.array([embed_code(query)], dtype="float32")
    # --- PASS 1---
    D, I = index.search(q_vec, top_k)

    candidates = []
    for dist, idx in zip(D[0], I[0]):
        if idx < len(id_map):
            el_id = id_map[idx]
            el = id_to_element[el_id]
            candidates.append({"id": el_id, "element": el, "score_pass1": float(dist)})

    # --- PASS 2---
    reranked = []
    for c in candidates:
        try:
            summary = summarize_code(c["element"]["code"])
            print(summary)
            summary_vec = np.array(embed_code(summary), dtype="float32")
            sim = float(np.dot(q_vec, summary_vec) / (np.linalg.norm(q_vec) * np.linalg.norm(summary_vec)))
            c["summary"] = summary
            c["score_pass2"] = sim
            reranked.append(c)
        except Exception as e:
            c["summary"] = ""
            c["score_pass2"] = -1.0
            reranked.append(c)

    reranked.sort(key=lambda x: x["score_pass2"], reverse=True)
    reranked=reranked[::-1]
    return reranked