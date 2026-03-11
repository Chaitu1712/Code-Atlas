import React, { useState } from 'react';

export default function CyclesAlert({ cycles }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!cycles || cycles.length === 0) return null;

    return (
        <>
            <div 
                onClick={() => setIsOpen(true)}
                style={{
                    position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 20,
                    background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48",
                    padding: "10px 20px", borderRadius: "24px", cursor: "pointer",
                    boxShadow: "0 10px 15px -3px rgba(225, 29, 72, 0.2), 0 0 0 4px rgba(225, 29, 72, 0.1)",
                    display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "14px",
                    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                }}
            >
                {cycles.length} Cyclic Dependenc{cycles.length === 1 ? 'y' : 'ies'} Detected
            </div>

            <style>
                {`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .7; } }`}
            </style>

            {isOpen && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
                    background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
                    display: "flex", justifyContent: "center", alignItems: "center"
                }}>
                    <div style={{
                        background: "#ffffff", padding: "30px", borderRadius: "16px", width: "600px", maxHeight: "80vh",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", display: "flex", flexDirection: "column"
                    }}>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <div>
                                <h2 style={{ margin: 0, color: "#0f172a", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ color: "#e11d48" }}>⚠️</span> Architecture Warning
                                </h2>
                                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
                                    Circular imports can cause tight coupling and initialization errors.
                                </p>
                            </div>
                            <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", fontSize: "20px", color: "#94a3b8", cursor: "pointer" }}>✕</button>
                        </div>

                        <div style={{ overflowY: "auto", flex: 1, paddingRight: "10px" }}>
                            {cycles.map((cycle, i) => (
                                <div key={i} style={{
                                    background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px",
                                    borderRadius: "12px", marginBottom: "12px"
                                }}>
                                    <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                                        Cycle #{i + 1}
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", fontSize: "14px", fontFamily: "monospace", color: "#334155" }}>
                                        {cycle.map((node, j) => (
                                            <React.Fragment key={j}>
                                                <span style={{ background: "#e2e8f0", padding: "4px 8px", borderRadius: "6px" }}>{node}</span>
                                                <span style={{ color: "#94a3b8" }}>➔</span>
                                            </React.Fragment>
                                        ))}
                                        <span style={{ background: "#fecdd3", color: "#be123c", padding: "4px 8px", borderRadius: "6px", fontWeight: "bold" }}>
                                            {cycle[0]}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}