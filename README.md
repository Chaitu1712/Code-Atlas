<img width="1194" height="653" alt="image" src="https://github.com/user-attachments/assets/fc3402aa-9b78-433e-ad89-2100d53f1bcf" /># 🗺️ Code Atlas

**Code Atlas** is a locally-hosted, AI-powered codebase architecture visualizer. It instantly parses your source code into an interactive 3D map, automatically detects cross-language API connections, and allows you to chat with an AI assistant that understands the precise structural context of your codebase.

<p align="center">
  <img src="./assets/demo.gif" alt="Code Atlas Interactive Demo" width="100%" />
</p>

## ✨ Key Features

* 🕸️ **Interactive 3D Architecture Map:** Built with D3.js, visualize files, packages, classes, and functions as a physics-simulated, highly navigable force-directed graph.
* 🔌 **Cross-Language API Linkage:** Automatically connects Frontend `fetch()` / `axios` calls (JS/TS/React) directly to Backend endpoints (Python FastAPI/Flask) with glowing cross-repository dependency lines.
* 🤖 **Context-Aware AI Assistant:** Click on any node and ask questions like *"What breaks if I change this function?"* The AI is automatically fed the node's source code, caller/callee context, and repository README.
* ☁️/🔒 **Cloud & Local Offline AI:** Supports lightning-fast cloud models (Google Gemini 2.5 Flash) and 100% offline, privacy-respecting local models (Llama-3, Phi-3, DeepSeek via `.gguf` and `llama.cpp`).
* 🔍 **Semantic Search:** Search your codebase using plain English ("Where is the database authentication logic?") powered by local vector embeddings (`sentence-transformers` + `FAISS`).
* ⚠️ **Cyclic Dependency Detection:** Automatically flags circular imports (A ➔ B ➔ A) with a pulsing UI alert to help you refactor tight coupling.
* 🐙 **Git Authorship Integration:** Instantly see the Original Author and Recent Heavy Modifier for any function/class directly in the code panel.

## 🛠️ Tech Stack

**Backend:**

* **Python 3.11+**
* **FastAPI** (Async API, WebSocket progress streaming)
* **Tree-sitter** (Fault-tolerant AST parsing for Python, JS, TS, JSX, TSX)
* **NetworkX** (Graph modeling and Cycle detection)
* **SQLite** (Relational metadata storage)
* **FAISS & Sentence-Transformers** (Local Vector DB)
* **Llama-cpp-python & Google Generative AI** (LLM inference engines)

**Frontend:**

* **React 18** (Vite, React Router)
* **D3.js** (Force-directed graph physics, minimap, zooming/panning)
* **React-Markdown & SyntaxHighlighter** (Code rendering)

## 🚀 Getting Started

### Prerequisites

* Python 3.11 or higher
* Node.js v18 or higher
* Git

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/code-atlas.git
cd code-atlas
```

### 2. Setup the Backend

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
python api.py
```

### 3. Setup the Frontend

Open a **new terminal window**:

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the App

Navigate to `http://localhost:5173/` in your browser.
On your first visit, you will be prompted to enter a **Gemini API Key** (Free) or download a **Local GGUF Model** to power the AI Assistant.

## 🎮 Usage

1. **Parse a Codebase:** Click the **+** button on the Landing Page. Enter a Project Name and the absolute path to a local folder on your machine.
2. **Watch the Magic:** Code Atlas will aggressively prune ignored folders (like `node_modules`), parse the AST, generate semantic embeddings, and link your APIs.
3. **Explore:** Scroll to zoom, click and drag to pan. Drag nodes to pin them to specific locations (layout state is automatically saved!).
4. **Inspect & Chat:** Click any node to slide out the Code Panel. View the syntax-highlighted source code, check Git Blame stats, or switch to the **Ask AI** tab to chat with the engine about that specific architecture block.

## 🗺️ Roadmap (Coming Soon)

* [ ] **Heuristic Type Inference (LSP-Lite):** Improved tracking of class instantiations to resolve exact method calls across files without a full Language Server.
* [ ] **GitHub Auto-Ingestion:** Paste a GitHub URL to automatically clone (shallow), parse, and visualize a repository entirely from the UI.
* [ ] **Expanded Language Support:** Add `tree-sitter-java`, `tree-sitter-go`, and `tree-sitter-rust`.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/chaitu1712/code-atlas/issues).

## 📄 License

This project is licensed under the MIT License.
