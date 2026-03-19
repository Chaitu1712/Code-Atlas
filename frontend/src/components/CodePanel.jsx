import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { IconClose, IconAuthor, IconModifier } from './Icons'; 

export default function CodePanel({ viewingCode, setViewingCode, isCodeLoading }) {
    if (!viewingCode) return null;

    return (
        <div style={{
            position: "absolute", top: 24, right: 24, width: "500px", zIndex: 10, background: "#ffffff", 
            border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: "16px", boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.1)", 
            display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 48px)"
        }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#f8fafc", borderRadius: "16px 16px 0 0" }}>
                <div>
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "16px", fontWeight: 600 }}>{viewingCode.name || viewingCode.id.split('.').pop()}</h3>
                    <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "12px", fontFamily: "monospace" }}>
                        {viewingCode.filepath ? `${viewingCode.filepath} : L${viewingCode.line_start}-${viewingCode.line_end}` : viewingCode.type}
                    </p>
                    
                    {viewingCode.git && (
                        <div style={{ marginTop: "10px", display: "flex", gap: "10px", fontSize: "11px" }}>
                            <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "4px 8px", borderRadius: "4px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                                <IconAuthor /> Original: {viewingCode.git.original}
                            </span>
                            <span style={{ background: "#fce7f3", color: "#9d174d", padding: "4px 8px", borderRadius: "4px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                                <IconModifier /> Heavy Modifier: {viewingCode.git.heavy}
                            </span>
                        </div>
                    )}
                </div>
                <button onClick={() => setViewingCode(null)} style={{ background: "transparent", border: "none", fontSize: "20px", color: "#94a3b8", cursor: "pointer" }}><IconClose /></button>
            </div>
            
            <div style={{ padding: "0", flex: 1, overflowY: "auto", background: "#1e1e1e", borderRadius: "0 0 16px 16px" }}>
                {isCodeLoading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading syntax...</div>
                ) : viewingCode.code ? (
                    <SyntaxHighlighter language="python" style={vscDarkPlus} showLineNumbers={true} startingLineNumber={viewingCode.line_start} customStyle={{ margin: 0, padding: "20px", background: "transparent", fontSize: "13px" }}>
                        {viewingCode.code}
                    </SyntaxHighlighter>
                ) : (
                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", height: "100%" }}>{viewingCode.message}</div>
                )}
            </div>
        </div>
    );
}