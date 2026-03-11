import os
import fnmatch
from pathlib import Path
from typing import List

class GitIgnoreChecker:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir).resolve()
        
        self.ignore_patterns: List[str] = ['.git', '.venv', 'venv', '__pycache__', 'node_modules', '.next', 'dist', 'build'] 
        
        self._load_gitignore(self.root_dir)

    def _load_gitignore(self, directory: Path):
        """Recursively loads .gitignore files if nested ones exist."""
        gitignore_path = directory / ".gitignore"
        if gitignore_path.exists():
            with open(gitignore_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        if line.endswith("/"):
                            line = line[:-1]
                        self.ignore_patterns.append(line)

    def is_ignored(self, name: str, relative_path: str = "") -> bool:
        """
        Checks if a specific file/folder name OR its relative path matches an ignore pattern.
        This allows us to prune 'node_modules' instantly without checking every file inside it.
        """
        for pattern in self.ignore_patterns:
            if fnmatch.fnmatch(name, pattern):
                return True
            
            if relative_path and fnmatch.fnmatch(relative_path, pattern):
                return True
                
        return False