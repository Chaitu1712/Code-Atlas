from llama_cpp import Llama

# Load all-MiniLM-L6-v2 GGUF embedding model
embedder = Llama(model_path="models/all-MiniLM-L6-v2.F16.gguf", embedding=True)

def embed_code(code: str):
    response = embedder.embed(code)  # single string → returns list of embeddings
    return response  # list of floats
