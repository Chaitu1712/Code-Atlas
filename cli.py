import argparse
import json
import os
from pathlib import Path

from core.parser import CodeParser
from core.db import Database
from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService
from core.ignore import GitIgnoreChecker
from core.api_linker import APILinker

def get_project_paths(project_name: str):
    base_dir = Path("data") / project_name
    base_dir.mkdir(parents=True, exist_ok=True)
    return str(base_dir / "atlas.db"), str(base_dir / "atlas.index")

def parse_directory(target_dir: str, db: Database, db_path: str):
    parser = CodeParser()
    target_path = Path(target_dir)
    ignore_checker = GitIgnoreChecker(target_dir)
    
    valid_files = []
    valid_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx'}
    for root, dirs, files in os.walk(target_path):
        root_path = Path(root)
        try:
            rel_root = str(root_path.relative_to(target_path))
        except ValueError:
            rel_root = ""

        for i in range(len(dirs) - 1, -1, -1):
            d = dirs[i]
            if ignore_checker.is_ignored(d, os.path.join(rel_root, d)):
                del dirs[i]
                
        for f in files:
            file_path = root_path / f
            if file_path.suffix in valid_extensions:
                if not ignore_checker.is_ignored(f, os.path.join(rel_root, f)):
                    valid_files.append(file_path)

    print(f"Found and parsing {len(valid_files)} source files (Ignored directories aggressively pruned)...")

    for file in valid_files:
        try:
            db.save_module(parser.parse_file(str(file)))
        except Exception as e:
            print(f"Failed to parse {file}: {e}")
            
    print("AST Parsing complete. Running Cross-Language API Linker...")
    
    linker = APILinker(db_path)
    linker.run_linkage()
    
    print("API Linkage complete and saved to database.")

def main():
    parser = argparse.ArgumentParser(description="Code Atlas CLI")
    subparsers = parser.add_subparsers(dest="command")

    for cmd in ["parse", "graph", "embed", "search"]:
        p = subparsers.add_parser(cmd)
        p.add_argument("--project", required=True, help="Name of the project (e.g., my_app)")
        
        if cmd == "parse":
            p.add_argument("directory", help="Target directory to parse")
        elif cmd == "graph":
            p.add_argument("--out", default="graph.json", help="Output JSON file")
        elif cmd == "search":
            p.add_argument("query", help="Natural language query")
            p.add_argument("--top", type=int, default=3, help="Number of results")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return

    db_path, index_path = get_project_paths(args.project)

    if args.command == "parse":
        if os.path.exists(db_path): os.remove(db_path)
        db = Database(db_path)
        
        parse_directory(args.directory, db, db_path) 

    elif args.command == "graph":
        analyzer = GraphAnalyzer(db_path)
        analyzer.build_module_graph()
        
        cycles = analyzer.get_cyclic_dependencies()
        if cycles:
            print(f"Warning: Found {len(cycles)} circular dependencies!")
            
        with open(args.out, "w") as f:
            json.dump(analyzer.export_json(), f, indent=4)
        print(f"Dependency graph saved to {args.out}")

    elif args.command == "embed":
        embedder = EmbeddingService(db_path, index_path)
        embedder.generate_embeddings()

    elif args.command == "search":
        os.environ["TOKENIZERS_PARALLELISM"] = "false"
        embedder = EmbeddingService(db_path, index_path)
        print(f"🔍 Searching '{args.project}' for: '{args.query}'...\n")
        results = embedder.search(args.query, top_k=args.top)
        
        if not results:
            print("No results found.")
        else:
            for i, res in enumerate(results, 1):
                print(f"{i}. [{res['type'].upper()}] {res['name']} (Dist: {res['distance']:.2f})")
                print(f"   File: {res['filepath']} (L{res['line']})\n")

if __name__ == "__main__":
    main()