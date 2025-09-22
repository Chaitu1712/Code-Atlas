from llama_cpp import Llama

embedder = Llama(model_path="models/all-MiniLM-L6-v2.F16.gguf", embedding=True)

def embed_code(code: str):
    response = embedder.embed(code)
    return response