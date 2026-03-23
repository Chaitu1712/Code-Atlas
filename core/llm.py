import sqlite3
from pathlib import Path
from core.config import get_config, save_config
from huggingface_hub import hf_hub_download
from google import genai
from google.genai import types
from llama_cpp import Llama

class CodeAtlasAI:
    def __init__(self, db_path: str, project_dir: str):
        self.db_path = db_path
        self.project_dir = Path(project_dir)
        self.config = get_config()
        self.local_llm = None
        self.current_loaded_model_path = None

    def _get_context(self, node_id: str) -> dict:
        node_name = node_id.split('.')[-1]
        
        safe_db_path = Path(self.db_path).resolve()
        if not safe_db_path.exists():
            print(f"Error: Database not found at {safe_db_path}")
            return None
        conn = sqlite3.connect(str(safe_db_path), check_same_thread=False, timeout=10)
        
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT node_type, code_snippet, filepath FROM nodes n JOIN files f ON n.file_id = f.id WHERE n.name = ?", (node_name,))
            row = cursor.fetchone()
            if not row: 
                return None
                
            node_type, snippet, filepath = row
            callers = [r[0] for r in cursor.execute("SELECT caller FROM calls WHERE callee = ?", (node_name,)).fetchall()]
            callees = [r[0] for r in cursor.execute("SELECT callee FROM calls WHERE caller = ?", (node_name,)).fetchall()]
            
            return { "name": node_id, "type": node_type, "filepath": filepath, "code": snippet, "callers": list(set(callers)), "callees": list(set(callees)) }
        finally:
            conn.close()
            
    def download_model(self, repo_id: str, filename: str, display_name: str):
        """Downloads model and adds it to the list of available local models."""
        models_dir = Path("models")
        models_dir.mkdir(exist_ok=True)
        
        downloaded_path = hf_hub_download(repo_id=repo_id, filename=filename, local_dir=str(models_dir), local_dir_use_symlinks=False)
        
        self.config = get_config()
        new_model = {"name": display_name or filename, "path": downloaded_path, "repo": repo_id, "filename": filename}

        self.config["local_models"] = [m for m in self.config.get("local_models", []) if m["path"] != downloaded_path]
        self.config["local_models"].append(new_model)
        self.config["active_local_model"] = downloaded_path
        
        save_config(self.config)
        return downloaded_path

    async def stream_chat(self, node_id: str, user_message: str, selected_model: str):
        context = self._get_context(node_id)
        if not context:
            yield "Error: Could not find code context for this node."
            return

        self.config = get_config()
        system_prompt = f"You are Code Atlas, a Staff Software Architect. You are analyzing {context['name']} ({context['filepath']}).\nIt is called by: {', '.join(context['callers']) or 'None'}\nIt calls: {', '.join(context['callees']) or 'None'}\n\nCODE:\n```\n{context['code']}\n```"

        if self.config["mode"] == "online":
            if not self.config.get("gemini_api_key"):
                yield "Error: Gemini API Key is missing. Switch to Offline mode or update Settings."
                return
            
            try:
                client = genai.Client(api_key=self.config["gemini_api_key"])
                model=selected_model or self.config["active_online_model"]
                response = client.models.generate_content_stream(model=model, contents=f"{system_prompt}\n\nUSER QUESTION: {user_message}")
                for chunk in response:
                    if chunk.text: yield chunk.text
            except Exception as e:
                yield f"\n\n[Gemini Error: {str(e)}]"
                
        else:
            model_path = selected_model or self.config.get("active_local_model")
            if not model_path or not Path(model_path).exists():
                yield "Error: Local model not found. Switch to Online mode or download a model in Settings."
                return
                
            try:
                # If a different model is selected, or no model is loaded, load it into RAM
                if not self.local_llm or self.current_loaded_model_path != model_path:
                    if self.local_llm:
                        del self.local_llm # Free RAM
                    
                    self.local_llm = Llama(model_path=model_path, n_ctx=4096,n_gpu_layers=-1,verbose=False)
                    self.current_loaded_model_path = model_path
                
                stream = self.local_llm.create_chat_completion(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    stream=True,
                    max_tokens=1024
                )
                
                for chunk in stream:
                    delta = chunk["choices"][0]["delta"]
                    if "content" in delta:
                        yield delta["content"]
            except Exception as e:
                yield f"\n\n[Local AI Error: {str(e)}]"