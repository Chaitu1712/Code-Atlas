import json
from pathlib import Path

def get_user_config_path(username: str) -> Path:
    config_path = Path(f"data/users/{username}/config.json")
    config_path.parent.mkdir(parents=True, exist_ok=True)
    return config_path

def get_config(username: str):
    config_file = get_user_config_path(username)
    if not config_file.exists():
        return {
            "mode": "online", 
            "gemini_api_key": "",
            "active_online_model": "gemini-2.5-flash"
        }
    with open(config_file, "r") as f:
        return json.load(f)

def save_config(username: str, new_config: dict):
    config_file = get_user_config_path(username)
    with open(config_file, "w") as f:
        json.dump(new_config, f, indent=4)

def is_setup_complete(username: str) -> bool:
    config = get_config(username)
    return bool(config.get("gemini_api_key"))