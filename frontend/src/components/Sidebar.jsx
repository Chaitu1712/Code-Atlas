import React from 'react';

export default function Sidebar({ 
    projects, currentProject, setCurrentProject, handleDeleteProject, setShowAddModal, 
    detailLevel, setDetailLevel, query, setQuery, handleSearch, isSearching, 
    searchResults, selectedNode, setSelectedNode 
}) {
    return (
        <div style={{ 
            position: "absolute", top: 24, left: 24, width: "340px", zIndex: 10,
            background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(16px)", 
            border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: "16px", padding: "24px", 
            boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.05)", display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)'
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                    <h1 style={{ margin: 0, color: "#0f172a", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Code Atlas</h1>
                    <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px", fontWeight: 500 }}>AI Architecture Visualizer</p>
                </div>
                <button onClick={() => setShowAddModal(true)} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: "8px", width: "32px", height: "32px", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                <select value={currentProject} onChange={(e) => setCurrentProject(e.target.value)} style={{ flex: 1, padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#fff", fontSize: "13px", fontWeight: 600, outline: "none", cursor: "pointer" }}>
                    {projects.length === 0 ? <option value="">Add a project...</option> : projects.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {projects.length > 0 && <button onClick={handleDeleteProject} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #fecdd3", background: "#fff1f2", color: "#e11d48", cursor: "pointer", fontWeight: "bold" }}>🗑</button>}
            </div>

            <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.04)", borderRadius: "8px", padding: "4px", marginBottom: "8px" }}>
                {[1, 2, 3].map(level => (
                    <button key={level} onClick={() => setDetailLevel(level)} disabled={!currentProject}
                        style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: currentProject ? "pointer" : "not-allowed", fontSize: "12px", background: detailLevel === level ? "#ffffff" : "transparent", color: detailLevel === level ? "#2563eb" : "#64748b", fontWeight: detailLevel === level ? 600 : 500, boxShadow: detailLevel === level ? "0 2px 4px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(0,0,0,0.05)" : "none", opacity: currentProject ? 1 : 0.5 }}>Level {level}</button>
                ))}
            </div>
            
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "15px", marginTop: "15px" }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search AI..." disabled={!currentProject} style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#ffffff", outline: "none", fontSize: "13px" }} />
                <button type="submit" disabled={isSearching || !currentProject} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 600, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", cursor: currentProject ? "pointer" : "not-allowed" }}>Find</button>
            </form>

            {searchResults.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "12px", padding: "12px", border: "1px solid rgba(0,0,0,0.05)", overflowY: "auto", flex: 1 }}>
                    {searchResults.map((res, i) => (
                        <div key={i} onClick={() => setSelectedNode(res)} style={{ marginBottom: i !== searchResults.length-1 ? "8px" : "0", padding: "10px", borderRadius: "8px", background: selectedNode?.name === res.name ? "#eff6ff" : "#ffffff", cursor: "pointer", border: selectedNode?.name === res.name ? "1px solid #bfdbfe" : "1px solid #f1f5f9" }}>
                            <div style={{ color: "#2563eb", fontWeight: 600, fontSize: "13px", display: "flex", justifyContent: "space-between" }}><span>{res.name}</span><span style={{color: "#94a3b8", fontSize: "10px"}}>{res.distance.toFixed(2)}</span></div>
                            <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", fontWeight: 500 }}>{res.type.toUpperCase()}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}