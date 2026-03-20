import json
from pathlib import Path

CONFIG_FILE = Path("data/config.json")

def get_config():
    if not CONFIG_FILE.exists():
        return {
            "mode": "online", 
            "gemini_api_key": "",
            "local_models": [],
            "active_local_model": "",
            "active_online_model": "gemini-2.5-flash"
        }
    with open(CONFIG_FILE, "r") as f:
        config = json.load(f)
        if "local_model_path" in config:
            if config["local_model_path"]:
                config["local_models"] = [{"name": config.get("local_filename", "Local Model"), "path": config["local_model_path"], "repo": config.get("local_repo_id", ""), "filename": config.get("local_filename", "")}]
                config["active_local_model"] = config["local_model_path"]
            del config["local_model_path"]
            if "local_repo_id" in config: del config["local_repo_id"]
            if "local_filename" in config: del config["local_filename"]
            save_config(config)
        return config

def save_config(new_config: dict):
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(new_config, f, indent=4)

def is_setup_complete() -> bool:
    config = get_config()
    has_online = bool(config.get("gemini_api_key"))
    has_offline = len(config.get("local_models", [])) > 0
    return has_online or has_offline