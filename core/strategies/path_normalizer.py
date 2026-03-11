from pathlib import Path

def normalize_path(filepath: str) -> str:
    """Delegates path normalization based on file extension."""
    ext = Path(filepath).suffix
    
    if ext == '.py':
        return _normalize_python(filepath)
    elif ext in ['.js', '.jsx', '.ts', '.tsx']:
        return _normalize_js_ts(filepath)
    else:
        return filepath.replace("\\", ".").replace("/", ".")

def _normalize_python(filepath: str) -> str:
    path_obj = Path(filepath)
    clean_path = str(path_obj.with_suffix(''))
    clean_path = clean_path.replace("\\", ".").replace("/", ".")
    
    if clean_path.endswith('.__init__'):
        return clean_path[:-9]
    elif clean_path == "__init__":
        return "root"
    return clean_path

def _normalize_js_ts(filepath: str) -> str:
    path_obj = Path(filepath)
    clean_path = str(path_obj.with_suffix(''))
    clean_path = clean_path.replace("\\", ".").replace("/", ".")
    
    if clean_path.endswith('.index'):
        return clean_path[:-6]
    elif clean_path == "index":
        return "root"
    return clean_path