# cli.py
import argparse
import json
from pathlib import Path
import os
from core.parser import CodeParser
from core.db import Database
from core.analyzer import GraphAnalyzer
from core.embeddings import EmbeddingService
from core.ignore import GitIgnoreChecker

def parse_directory(target_dir: str, db: Database):
    parser = CodeParser()
    path = Path(target_dir)
    py_files = list(path.rglob("*.py"))
    ignore_checker = GitIgnoreChecker(target_dir)
    
    # Filter files
    valid_files = [f for f in py_files if not ignore_checker.is_ignored(f)]
    
    print(f"Found {len(py_files)} Python files. ({len(py_files) - len(valid_files)} ignored). Parsing {len(valid_files)} files...")

    for file in valid_files:
        try:
            parsed = parser.parse_file(str(file))
            db.save_module(parsed)
        except Exception as e:
            print(f"Failed to parse {file}: {e}")
            
    print("✅ Parsing complete and saved to database.")

def main():
    parser = argparse.ArgumentParser(description="Code Atlas CLI")
    subparsers = parser.add_subparsers(dest="command")

    # `parse` command
    parse_cmd = subparsers.add_parser("parse", help="Parse a directory of Python files")
    parse_cmd.add_argument("directory", help="Target directory to parse")
    
    # `graph` command
    graph_cmd = subparsers.add_parser("graph", help="Generate dependency graph JSON")
    graph_cmd.add_argument("--out", default="graph.json", help="Output JSON file")
    
    embed_cmd = subparsers.add_parser("embed", help="Generate AI embeddings for the codebase")

    search_cmd = subparsers.add_parser("search", help="Search the codebase using natural language")
    search_cmd.add_argument("query", help="What are you looking for?")
    search_cmd.add_argument("--top", type=int, default=3, help="Number of results to return")
    
    args = parser.parse_args()

    # Shared DB instance
    db = Database()

    if args.command == "parse":
        parse_directory(args.directory, db)
        
    elif args.command == "graph":
        analyzer = GraphAnalyzer()
        analyzer.build_module_graph()
        
        # Check for circular dependencies
        cycles = analyzer.get_cyclic_dependencies()
        if cycles:
            print(f"⚠️ Warning: Found {len(cycles)} circular dependencies!")
            for cycle in cycles:
                print(f"   Cycle: {' -> '.join(cycle)} -> {cycle[0]}")
        else:
            print("✅ No circular dependencies found!")

        # Export JSON
        graph_data = analyzer.export_json()
        with open(args.out, "w") as f:
            json.dump(graph_data, f, indent=4)
        print(f"✅ Dependency graph saved to {args.out}")
    
    elif args.command == "embed":
        embedder = EmbeddingService()
        embedder.generate_embeddings()    
    elif args.command == "search":
        embedder = EmbeddingService()
        # Suppress the huggingface warnings to keep terminal clean
        os.environ["TOKENIZERS_PARALLELISM"] = "false"
        
        print(f"🔍 Searching for: '{args.query}'...\n")
        results = embedder.search(args.query, top_k=args.top)
        
        if not results:
            print("No results found.")
        else:
            for i, res in enumerate(results, 1):
                # Note: Lower distance means a closer match!
                print(f"{i}. [{res['type'].upper()}] {res['name']}")
                print(f"   File: {res['filepath']} (Line {res['line']})")
                print(f"   Distance: {res['distance']:.2f}\n")
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()