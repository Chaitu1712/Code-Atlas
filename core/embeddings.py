import sqlite3
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import os

class EmbeddingService:
    def __init__(self, db_path: str = "atlas.db", index_path: str = "atlas.index"):
        self.db_path = db_path
        self.index_path = index_path
        
        # Load a fast, lightweight local embedding model
        print("Loading embedding model (this may take a moment the first time)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # MiniLM-L6-v2 produces 384-dimensional vectors
        self.dimension = 384

        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            self.index = faiss.IndexIDMap(faiss.IndexFlatL2(self.dimension))
    def generate_embeddings(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Fetch all classes and functions
        cursor.execute("SELECT id, name, node_type, code_snippet FROM nodes WHERE code_snippet IS NOT NULL")
        nodes = cursor.fetchall()

        if not nodes:
            print("No code snippets found in database to embed.")
            return

        texts_to_embed = []
        node_ids =[]

        for node_id, name, node_type, snippet in nodes:
            # We create a rich "document" for the AI to understand the context
            semantic_doc = f"Type: {node_type}\nName: {name}\nCode:\n{snippet}"
            texts_to_embed.append(semantic_doc)
            node_ids.append(node_id)

        print(f"Generating embeddings for {len(texts_to_embed)} code blocks...")
        
        # Generate the vectors (creates a Matrix of [num_nodes, 384])
        embeddings = self.model.encode(texts_to_embed, show_progress_bar=True)

        # FAISS requires explicit numpy types (float32 for vectors, int64 for IDs)
        vectors_np = np.array(embeddings).astype('float32')
        ids_np = np.array(node_ids).astype('int64')

        # Add to FAISS Vector DB
        self.index = faiss.IndexIDMap(faiss.IndexFlatL2(self.dimension))
        self.index.add_with_ids(vectors_np, ids_np)
        faiss.write_index(self.index, self.index_path)
        print(f"✅ Successfully saved {len(texts_to_embed)} vectors to {self.index_path}")
    def search(self, query: str, top_k: int = 5) -> list:
        """Searches the codebase using a natural language query."""
        if not os.path.exists(self.index_path) or self.index.ntotal == 0:
            print("⚠️ Index is empty or missing. Run 'embed' first.")
            return[]

        # 1. Convert the search query into a vector
        query_vector = self.model.encode([query]).astype('float32')

        # 2. Search FAISS for the nearest L2 distances
        distances, indices = self.index.search(query_vector, top_k)

        results =[]
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # 3. Map FAISS IDs back to SQLite Nodes
        for i, node_id in enumerate(indices[0]):
            if node_id == -1: 
                continue  # FAISS returns -1 if there aren't enough vectors
            
            cursor.execute("""
                SELECT n.name, n.node_type, f.filepath, n.start_line
                FROM nodes n
                JOIN files f ON n.file_id = f.id
                WHERE n.id = ?
            """, (int(node_id),))
            
            row = cursor.fetchone()
            if row:
                results.append({
                    "distance": float(distances[0][i]),
                    "name": row[0],
                    "type": row[1],
                    "filepath": row[2],
                    "line": row[3]
                })

        return results