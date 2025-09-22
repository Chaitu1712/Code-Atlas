from llama_cpp import Llama
llm = Llama(model_path="models/phi-2.Q4_K_M.gguf", n_ctx=4096)
def summarize_code(code: str) -> str:
    prompt = f"Summarize this Python function or class in one concise sentence:\n\n{code}\n\nSummary:"
    response = llm(prompt, max_tokens=120, stop=["\n"])
    return response['choices'][0]['text'].strip()