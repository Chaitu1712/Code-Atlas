import React from 'react';
import { Link } from 'react-router-dom';
import { IconHome, IconSearch } from './Icons';

export default function Sidebar({ 
    currentProject, detailLevel, setDetailLevel, query, setQuery, 
    handleSearch, isSearching, searchResults, selectedNode, setSelectedNode 
}) {
    return (
        <div style={{ 
            position: "absolute", top: 24, left: 24, width: "340px", zIndex: 10,
            background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(16px)", 
            border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: "16px", padding: "24px", 
            boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.05)", display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)'
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                    <h1 style={{ margin: 0, color: "#0f172a", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Code Atlas</h1>
                    <p style={{ margin: "4px 0 0 0", color: "#2563eb", fontSize: "14px", fontWeight: 600 }}>{currentProject}</p>
                </div>
                <Link to="/" style={{ background: "#f1f5f9", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                    <IconHome />
                </Link>
            </div>

            <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.04)", borderRadius: "8px", padding: "4px", marginBottom: "8px" }}>
                {[1, 2, 3].map(level => (
                    <button key={level} onClick={() => setDetailLevel(level)}
                        style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", background: detailLevel === level ? "#ffffff" : "transparent", color: detailLevel === level ? "#2563eb" : "#64748b", fontWeight: detailLevel === level ? 600 : 500, boxShadow: detailLevel === level ? "0 2px 4px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s ease" }}>Level {level}</button>
                ))}
            </div>
            
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", marginBottom: "15px", marginTop: "15px" }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search AI..." style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#ffffff", outline: "none", fontSize: "13px" }} />
                <button type="submit" disabled={isSearching} style={{ padding: "10px 16px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: 600, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "white", cursor: "pointer", display: "flex", gap: "8px" }}>
                    <IconSearch /> Find
                </button>
            </form>
            {isSearching ? (
                <div style={{ 
                    background: "rgba(255,255,255,0.6)", borderRadius: "12px", padding: "30px 20px", 
                    border: "1px solid rgba(0,0,0,0.05)", textAlign: "center", color: "#64748b", fontSize: "13px" 
                }}>
                    <div style={{ marginBottom: "8px", fontSize: "20px", animation: "pulse 1.5s infinite" }}>🧠</div>
                    Scanning semantic vectors...
                </div>
            ) : searchResults.length > 0 ? (
                <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "12px", padding: "12px", border: "1px solid rgba(0,0,0,0.05)", overflowY: "auto", flex: 1 }}>
                    {searchResults.map((res, i) => (
                        <div key={i} onClick={() => setSelectedNode(res)} style={{ marginBottom: i !== searchResults.length-1 ? "8px" : "0", padding: "10px", borderRadius: "8px", background: selectedNode?.id === res.id ? "#eff6ff" : "#ffffff", cursor: "pointer", border: selectedNode?.id === res.id ? "1px solid #bfdbfe" : "1px solid #f1f5f9" }}>
                            <div style={{ color: "#2563eb", fontWeight: 600, fontSize: "13px", display: "flex", justifyContent: "space-between" }}><span>{res.name}</span><span style={{color: "#94a3b8", fontSize: "10px"}}>{"Distance: "+res.distance.toFixed(2)}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                                <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 500 }}>{res.type.toUpperCase()}</span>
                                <span title={res.filepath.split('\\').slice(-2).join('\\')} style={{ color: "#94a3b8", fontSize: "10px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginLeft: "10px", textAlign: "right", direction: "rtl" }}>{res.filepath}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}