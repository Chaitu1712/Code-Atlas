import sqlite3
from pathlib import Path
from core.config import get_config
from google import genai

class CodeAtlasAI:
    def __init__(self, db_path: str, project_dir: str):
        self.db_path = db_path
        self.project_dir = Path(project_dir)

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

    async def stream_chat(self, node_id: str, user_message: str, selected_model: str):
        context = self._get_context(node_id)
        if not context:
            yield "Error: Could not find code context for this node."
            return

        # Always fetch fresh config
        config = get_config()
        
        if not config.get("gemini_api_key"):
            yield "Error: Gemini API Key is missing. Please update it in Settings."
            return

        system_prompt = f"You are Code Atlas, a Staff Software Architect. You are analyzing {context['name']} ({context['filepath']}).\nIt is called by: {', '.join(context['callers']) or 'None'}\nIt calls: {', '.join(context['callees']) or 'None'}\n\nCODE:\n```\n{context['code']}\n```"

        try:
            client = genai.Client(api_key=config["gemini_api_key"])
            model_name = selected_model or config.get("active_online_model", "gemini-2.5-flash")
            
            response = client.models.generate_content_stream(
                model=model_name, 
                contents=f"{system_prompt}\n\nUSER QUESTION: {user_message}"
            )
            
            for chunk in response:
                if chunk.text: 
                    yield chunk.text
                    
        except Exception as e:
            yield f"\n\n[Gemini Error: {str(e)}]"