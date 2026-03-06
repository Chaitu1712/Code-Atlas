import sqlite3
from core.models import ParsedModule

class Database:
    def __init__(self, db_path: str = "atlas.db"):
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self._setup_tables()
        
    def _setup_tables(self):
        self.cursor.executescript("""
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filepath TEXT UNIQUE
            );
            CREATE TABLE IF NOT EXISTS nodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER,
                name TEXT,
                node_type TEXT,
                start_line INTEGER,
                end_line INTEGER,
                code_snippet TEXT,  -- <-- NEW COLUMN
                FOREIGN KEY(file_id) REFERENCES files(id)
            );
            CREATE TABLE IF NOT EXISTS imports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER,
                imported_module TEXT,
                imported_names TEXT,  -- <-- NEW COLUMN
                line INTEGER,
                FOREIGN KEY(file_id) REFERENCES files(id)
            );
        """)
        self.conn.commit()


    def save_module(self, module):
        # Insert File
        self.cursor.execute("INSERT OR REPLACE INTO files (filepath) VALUES (?)", (module.filepath,))
        file_id = self.cursor.execute("SELECT id FROM files WHERE filepath = ?", (module.filepath,)).fetchone()[0]

        # Clear old data
        self.cursor.execute("DELETE FROM nodes WHERE file_id = ?", (file_id,))
        self.cursor.execute("DELETE FROM imports WHERE file_id = ?", (file_id,))

        # Insert Classes & Functions
        for node in module.classes + module.functions:
            self.cursor.execute("""
                INSERT INTO nodes (file_id, name, node_type, start_line, end_line, code_snippet)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (file_id, node.name, node.node_type, node.range.start_line, node.range.end_line, node.code_snippet))
        # Insert Imports
        for imp in module.imports:
            names_str = ",".join(imp.names) # Convert list to comma-separated string
            self.cursor.execute("""
                INSERT INTO imports (file_id, imported_module, imported_names, line)
                VALUES (?, ?, ?, ?)
            """, (file_id, imp.module, names_str, imp.line))

        self.conn.commit()