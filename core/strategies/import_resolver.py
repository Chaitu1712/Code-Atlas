# core/strategies/import_resolver.py
from pathlib import Path

def resolve_import(source_filepath: str, source_module: str, imported_module: str, internal_modules: set) -> str:
    """Delegates import resolution based on the source file's language."""
    ext = Path(source_filepath).suffix
    
    if ext == '.py':
        return _resolve_python_import(source_module, imported_module, internal_modules)
    elif ext in ['.js', '.jsx', '.ts', '.tsx']:
        return _resolve_js_ts_import(imported_module, internal_modules)
    else:
        return imported_module

def _resolve_python_import(source_module: str, imported_module: str, internal_modules: set) -> str:
    """Resolves Python imports using DB lookups."""
    if imported_module.startswith("."):
        dot_count = len(imported_module) - len(imported_module.lstrip("."))
        relative_name = imported_module.lstrip(".")
        parts = source_module.split(".")
        base = parts[:-dot_count] if dot_count <= len(parts) else []
        candidate = ".".join(base + [relative_name]) if relative_name else ".".join(base)
        if candidate in internal_modules:
            return candidate

    if imported_module in internal_modules:
        return imported_module

    for mod in internal_modules:
        if mod.endswith(f".{imported_module}"):
            return mod

    return imported_module

def _resolve_js_ts_import(imported_module: str, internal_modules: set) -> str:
    """Resolves JS/TS imports purely by querying the known DB modules."""
    if not imported_module.startswith((".", "/", "@", "~")):
        return imported_module.split('/')[0]

    clean_import = imported_module
    for prefix in ["../", "./", "~/", "@/"]:
        while clean_import.startswith(prefix): 
            clean_import = clean_import[len(prefix):]
            
    for ext in [".jsx", ".js", ".tsx", ".ts"]:
        if clean_import.endswith(ext):
            clean_import = clean_import[:-len(ext)]

    target_suffix = clean_import.replace("/", ".")

    for mod in internal_modules:
        if mod == target_suffix or mod.endswith(f".{target_suffix}"):
            return mod

    file_name = target_suffix.split(".")[-1]
    for mod in internal_modules:
        if mod.endswith(f".{file_name}"):
            return mod

    return target_suffix