// frontend/src/App.jsx
import { useState, useEffect } from 'react'
import GraphVisualizer from './GraphVisualizer'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

function App() {
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [detailLevel, setDetailLevel] = useState(3)
  
  // NEW: State for the Code Panel
  const [viewingCode, setViewingCode] = useState(null)
  const [isCodeLoading, setIsCodeLoading] = useState(false)

  useEffect(() => {
    fetch('http://localhost:8000/api/graph')
      .then(res => res.json())
      .then(data => { setGraphData(data); setLoading(false); })
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) { clearSearch(); return; }
    
    setIsSearching(true);
    setSelectedNode(null);
    setViewingCode(null); // Close panel on new search
    try {
      const res = await fetch(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) { console.error(err); } 
    finally { setIsSearching(false); }
  }

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setSelectedNode(null);
  }

  // NEW: Fetch Code when Node is Clicked in D3
  const handleNodeClick = async (nodeId) => {
    setIsCodeLoading(true);
    try {
        const res = await fetch(`http://localhost:8000/api/node/${encodeURIComponent(nodeId)}`);
        const data = await res.json();
        setViewingCode(data);
    } catch (err) {
        console.error("Failed to fetch code:", err);
    } finally {
        setIsCodeLoading(false);
    }
  }

  return (
    <div style={{ margin: 0, padding: 0, height: "100vh", backgroundColor: "#f8fafc", position: "relative", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>
      
      {/* Sidebar */}
      <div style={{ 
          position: "absolute", top: 24, left: 24, width: "340px", zIndex: 10,
          background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(16px)", 
          border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: "16px", padding: "24px", 
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.05)"
      }}>
        <div style={{ marginBottom: "24px" }}>
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Code Atlas</h1>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px", fontWeight: 500 }}>AI Architecture Visualizer</p>
        </div>

        <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.04)", borderRadius: "8px", padding: "4px", marginBottom: "8px" }}>
            {[1, 2, 3].map(level => (
                <button key={level} onClick={() => setDetailLevel(level)}
                    style={{
                        flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                        background: detailLevel === level ? "#ffffff" : "transparent",
                        color: detailLevel === level ? "#2563eb" : "#64748b",
                        fontWeight: detailLevel === level ? 600 : 500,
                        boxShadow: detailLevel === level ? "0 2px 4px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(0,0,0,0.05)" : "none",
                        transition: "all 0.2s ease"
                    }}>
                    Level {level}
                </button>
            ))}
        </div>
        <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "24px", textAlign: "center", fontWeight: 500 }}>
            {detailLevel === 1 && "Modules & Packages"}
            {detailLevel === 2 && "Including Classes"}
            {detailLevel === 3 && "Including Functions"}
        </div>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search AI..." 
            style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#ffffff", outline: "none", fontSize: "13px" }}
          />
          <button type="submit" disabled={isSearching} style={{
              padding: "10px 16px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 600,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", cursor: "pointer"
            }}>Find</button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "12px", padding: "12px", border: "1px solid rgba(0,0,0,0.05)", maxHeight: "350px", overflowY: "auto" }}>
            {searchResults.map((res, i) => (
              <div key={i} onClick={() => setSelectedNode(res)}
                style={{ marginBottom: i !== searchResults.length-1 ? "8px" : "0", padding: "10px", borderRadius: "8px", background: selectedNode?.name === res.name ? "#eff6ff" : "#ffffff", cursor: "pointer" }}
              >
                <div style={{ color: "#2563eb", fontWeight: 600, fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
                  <span>{res.name}</span><span style={{color: "#94a3b8", fontSize: "10px"}}>{res.distance.toFixed(2)}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", fontWeight: 500 }}>{res.type.toUpperCase()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- NEW: Slide-Out Code Panel --- */}
      <div style={{
          position: "absolute", top: 24, right: viewingCode ? 24 : -600, width: "500px", zIndex: 10,
          background: "#ffffff", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: "16px",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.1)", transition: "right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 48px)"
      }}>
        {viewingCode && (
            <>
                {/* Panel Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderRadius: "16px 16px 0 0" }}>
                    <div>
                        <h3 style={{ margin: 0, color: "#0f172a", fontSize: "16px", fontWeight: 600 }}>{viewingCode.name || viewingCode.id.split('.').pop()}</h3>
                        <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "12px", fontFamily: "monospace" }}>
                            {viewingCode.filepath ? `${viewingCode.filepath} : L${viewingCode.line_start}-${viewingCode.line_end}` : viewingCode.type}
                        </p>
                    </div>
                    <button onClick={() => setViewingCode(null)} style={{ background: "transparent", border: "none", fontSize: "20px", color: "#94a3b8", cursor: "pointer" }}>✕</button>
                </div>
                
                {/* Code Content */}
                <div style={{ padding: "0", flex: 1, overflowY: "auto", background: "#1e1e1e", borderRadius: "0 0 16px 16px" }}>
                    {isCodeLoading ? (
                        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading syntax...</div>
                    ) : viewingCode.code ? (
                        <SyntaxHighlighter 
                            language="python" 
                            style={vscDarkPlus} 
                            customStyle={{ margin: 0, padding: "20px", background: "transparent", fontSize: "13px", lineHeight: "1.5" }}
                            showLineNumbers={true}
                            startingLineNumber={viewingCode.line_start}
                        >
                            {viewingCode.code}
                        </SyntaxHighlighter>
                    ) : (
                        <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", height: "100%" }}>
                            {viewingCode.message || "Code block not extracted for this node type."}
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
      
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#64748b" }}>Loading physics engine...</div>
      ) : (
        <GraphVisualizer 
            graphData={graphData} searchResults={searchResults} 
            selectedNode={selectedNode} detailLevel={detailLevel} 
            onNodeClick={handleNodeClick} 
        />
      )}
    </div>
  )
}

export default App