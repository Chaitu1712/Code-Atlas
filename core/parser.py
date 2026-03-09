from pathlib import Path
from core.models import ParsedModule
from core.parsers.python_parser import PythonParser
from core.parsers.ts_parser import TSParser

class CodeParser:
    def __init__(self):
        self.py_parser = PythonParser()
        self.ts_parser = TSParser()
        
    def parse_file(self, filepath: str) -> ParsedModule:
        ext = Path(filepath).suffix
        if ext == '.py':
            return self.py_parser.parse_file(filepath)
        elif ext in ['.js', '.jsx', '.ts', '.tsx']:
            return self.ts_parser.parse_file(filepath)
        else:
            raise ValueError(f"Unsupported file type: {ext}")