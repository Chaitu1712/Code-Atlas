from parser import parse_codebase
from embedder import embed_code
import json, os

REPO_PATH = "sample/data"
OUTPUT_PATH = "data/parsed_embedded.json"

def main():
    parsed = parse_codebase(REPO_PATH)

    for el in parsed['elements']:
        try:
            el['embedding'] = embed_code(el['code'])
        except Exception as e:
            print(f"[WARN] Failed to embed {el['id']}: {e}")
            el['embedding'] = []

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(parsed, f, indent=2)

    print(f"Parsed {len(parsed['elements'])} elements → {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
