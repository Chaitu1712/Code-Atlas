import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SetupPage() {
    const [mode, setMode] = useState('online');
    const [geminiKey, setGeminiKey] = useState('');
    const [repoId, setRepoId] = useState('microsoft/Phi-3-mini-4k-instruct-gguf');
    const [filename, setFilename] = useState('Phi-3-mini-4k-instruct-q4.gguf');
    
    const [isSaving, setIsSaving] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/progress');
        ws.onmessage = (event) => setDownloadStatus(JSON.parse(event.data).message);
        return () => ws.close();
    }, []);

    const handleSetup = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        await fetch('http://localhost:8000/api/config', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, gemini_api_key: geminiKey })
        });

        if (mode === 'offline') {
            try {
                await fetch('http://localhost:8000/api/models/download', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repo_id: repoId, filename })
                });
            } catch (err) {
                alert("Download failed. Please check the repo ID and filename.");
                setIsSaving(false);
                return;
            }
        }
        
        window.location.href = '/';
    };

    return (
        <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Inter, sans-serif" }}>
            <div style={{ background: "#ffffff", padding: "40px", borderRadius: "16px", width: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
                <h1 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "24px" }}>Welcome to Code Atlas</h1>
                <p style={{ color: "#64748b", marginBottom: "30px", fontSize: "14px" }}>Configure your AI Engine to start querying your architecture.</p>

                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                    <button onClick={() => setMode('online')} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: mode === 'online' ? "2px solid #2563eb" : "1px solid #cbd5e1", background: mode === 'online' ? "#eff6ff" : "transparent", fontWeight: 600, color: mode === 'online' ? "#2563eb" : "#64748b", cursor: "pointer" }}>
                        ☁️ Online (Gemini)
                    </button>
                    <button onClick={() => setMode('offline')} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: mode === 'offline' ? "2px solid #10b981" : "1px solid #cbd5e1", background: mode === 'offline' ? "#ecfdf5" : "transparent", fontWeight: 600, color: mode === 'offline' ? "#10b981" : "#64748b", cursor: "pointer" }}>
                        🔒 Offline (Local Model)
                    </button>
                </div>

                <form onSubmit={handleSetup}>
                    {mode === 'online' ? (
                        <label style={{ display: "block", marginBottom: "20px", fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                            Google Gemini API Key (Free)
                            <input required type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{ width: "100%", padding: "12px", marginTop: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
                        </label>
                    ) : (
                        <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                            <label style={{ display: "block", marginBottom: "15px", fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                                HuggingFace Repo ID
                                <input required type="text" value={repoId} onChange={e => setRepoId(e.target.value)} placeholder="e.g. microsoft/Phi-3-mini-4k-instruct-gguf" style={{ width: "100%", padding: "10px", marginTop: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
                            </label>
                            <label style={{ display: "block", fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                                Exact .gguf Filename
                                <input required type="text" value={filename} onChange={e => setFilename(e.target.value)} placeholder="e.g. Phi-3-mini-4k-instruct-q4.gguf" style={{ width: "100%", padding: "10px", marginTop: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
                            </label>
                        </div>
                    )}

                    {downloadStatus && <div style={{ marginBottom: "15px", color: "#2563eb", fontSize: "12px", fontWeight: "bold", textAlign: "center" }}>{downloadStatus}</div>}

                    <button type="submit" disabled={isSaving || (mode === 'online' && !geminiKey)} style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: isSaving ? "#94a3b8" : "#0f172a", color: "white", fontWeight: 600, cursor: isSaving ? "wait" : "pointer" }}>
                        {isSaving ? "Saving Configuration..." : "Complete Setup"}
                    </button>
                </form>
            </div>
        </div>
    );
}