import sqlite3
import numpy as np
import faiss
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer

class EmbeddingService:
    def __init__(self, db_path: str, index_path: str):
        self.db_path = db_path
        self.index_path = index_path
        
        self.models_dir = Path("models").resolve()
        self.models_dir.mkdir(parents=True, exist_ok=True)
        
        model_name = 'all-MiniLM-L6-v2'
        expected_cache_dir = self.models_dir / f"models--sentence-transformers--{model_name}"
        
        is_offline = expected_cache_dir.exists()
        
        if is_offline:
            print(f"Loading cached embedding model from {self.models_dir} (Offline Mode)...")
        else:
            print("Downloading embedding model (this may take ~80MB the first time)...")

        self.model = SentenceTransformer(
            model_name,
            cache_folder=str(self.models_dir),
            local_files_only=is_offline
        )
        
        self.dimension = 384
        
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            self.index = faiss.IndexIDMap(faiss.IndexFlatL2(self.dimension))
    def generate_embeddings(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, node_type, code_snippet FROM nodes WHERE code_snippet IS NOT NULL")
        nodes = cursor.fetchall()
        conn.close()

        if not nodes:
            print("No code snippets found in database to embed.")
            return

        texts_to_embed = []
        node_ids = []

        for node_id, name, node_type, snippet in nodes:
            semantic_doc = f"Type: {node_type}\nName: {name}\nCode:\n{snippet}"
            texts_to_embed.append(semantic_doc)
            node_ids.append(node_id)

        print(f"Generating embeddings for {len(texts_to_embed)} code blocks...")
        
        embeddings = self.model.encode(texts_to_embed, show_progress_bar=True)

        vectors_np = np.array(embeddings).astype('float32')
        ids_np = np.array(node_ids).astype('int64')

        self.index = faiss.IndexIDMap(faiss.IndexFlatL2(self.dimension))
        self.index.add_with_ids(vectors_np, ids_np)
        faiss.write_index(self.index, self.index_path)
        print(f"✅ Successfully saved {len(texts_to_embed)} vectors to {self.index_path}")

    def search(self, query: str, top_k: int = 5) -> list:
        from core.strategies.path_normalizer import normalize_path

        if not os.path.exists(self.index_path) or self.index.ntotal == 0:
            return []

        query_vector = self.model.encode([query]).astype('float32')
        distances, indices = self.index.search(query_vector, top_k)

        results = []
        conn = sqlite3.connect(self.db_path)
        try:
            cursor = conn.cursor()
            for i, node_id in enumerate(indices[0]):
                if node_id == -1: continue
                
                cursor.execute("""
                    SELECT n.name, n.node_type, n.parent_name, f.filepath, n.start_line
                    FROM nodes n JOIN files f ON n.file_id = f.id WHERE n.id = ?
                """, (int(node_id),))
                
                row = cursor.fetchone()
                if row:
                    name, node_type, parent_name, filepath, start_line = row
                    
                    mod_name = normalize_path(filepath)
                    full_node_id = f"{mod_name}.{parent_name}.{name}" if parent_name else f"{mod_name}.{name}"
                    
                    results.append({
                        "distance": float(distances[0][i]),
                        "id": full_node_id,
                        "name": name,
                        "type": node_type,
                        "filepath": filepath,
                        "line": start_line
                    })
        finally:
            conn.close()
            
        return results