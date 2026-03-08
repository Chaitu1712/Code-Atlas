import os
import fnmatch
from pathlib import Path
from typing import List

class GitIgnoreChecker:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir).resolve()
        self.ignore_patterns: List[str] = ['.git', '.venv', 'venv', '__pycache__']
        
        gitignore_path = self.root_dir / ".gitignore"
        if gitignore_path.exists():
            with open(gitignore_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        if line.endswith("/"):
                            line = line[:-1]
                        self.ignore_patterns.append(line)

    def is_ignored(self, filepath: Path) -> bool:
        """Returns True if the file or any of its parent directories match the ignore patterns."""
        try:
            rel_path = filepath.resolve().relative_to(self.root_dir)
        except ValueError:
            return False

        parts = rel_path.parts
        for i in range(len(parts)):
            path_segment = "/".join(parts[:i+1])
            name_segment = parts[i]
            
            for pattern in self.ignore_patterns:
                if fnmatch.fnmatch(name_segment, pattern) or fnmatch.fnmatch(path_segment, pattern):
                    return True
                    
        return False