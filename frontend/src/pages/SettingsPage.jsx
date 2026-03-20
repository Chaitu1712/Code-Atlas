import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconHome, IconTrash } from '../components/Icons';

export default function SettingsPage() {
    const [config, setConfig] = useState(null);
    const [geminiKey, setGeminiKey] = useState('');
    
    // Download state
    const [repoId, setRepoId] = useState('');
    const [filename, setFilename] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState('');
    const [downloadPercent, setDownloadPercent] = useState(0);

    const fetchConfig = () => {
        fetch('http://localhost:8000/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data.config);
                setGeminiKey(data.config.gemini_api_key || '');
            });
    };

    useEffect(() => { fetchConfig(); }, []);

    // Listen to WebSocket for download progress
    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/progress');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setDownloadStatus(data.message);
            setDownloadPercent(data.percent);
            if (data.percent === 100) {
                setIsDownloading(false);
                setRepoId(''); setFilename(''); setDisplayName('');
                setTimeout(fetchConfig, 1000); // Refresh list
            }
        };
        return () => ws.close();
    }, []);

    const saveApiKey = async () => {
        await fetch('http://localhost:8000/api/config', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gemini_api_key: geminiKey })
        });
        alert("API Key Saved!");
    };

    const startDownload = async (e) => {
        e.preventDefault();
        setIsDownloading(true);
        setDownloadPercent(0);
        try {
            await fetch('http://localhost:8000/api/models/download', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_id: repoId, filename, display_name: displayName || filename })
            });
        } catch (err) {
            alert("Failed to start download.");
            setIsDownloading(false);
        }
    };

    const deleteModel = async (filenameToDelete) => {
        if (!window.confirm(`Delete ${filenameToDelete} from your hard drive?`)) return;
        await fetch(`http://localhost:8000/api/models/${encodeURIComponent(filenameToDelete)}`, { method: 'DELETE' });
        fetchConfig();
    };

    if (!config) return <div style={{ background: "#f8fafc", height: "100vh" }} />;

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "60px 20px", fontFamily: "Inter, sans-serif" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
                    <h1 style={{ fontSize: "32px", color: "#0f172a", margin: 0 }}>Settings</h1>
                    <Link to="/" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconHome /> Home</Link>
                </div>

                {/* Cloud Config */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
                    <h2 style={{ fontSize: "18px", margin: "0 0 15px 0", color: "#0f172a" }}>☁️ Cloud Provider</h2>
                    <label style={{ display: "block", fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Google Gemini API Key</label>
                    <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                        <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }} />
                        <button onClick={saveApiKey} style={{ padding: "0 20px", borderRadius: "8px", border: "none", background: "#2563eb", color: "white", fontWeight: "bold", cursor: "pointer" }}>Save</button>
                    </div>
                </div>

                {/* Download Local Model */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", marginBottom: "30px" }}>
                    <h2 style={{ fontSize: "18px", margin: "0 0 15px 0", color: "#0f172a" }}>⬇️ Download Local Model</h2>
                    <form onSubmit={startDownload} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                        <label style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>HuggingFace Repo ID
                            <input required type="text" value={repoId} onChange={e => setRepoId(e.target.value)} placeholder="microsoft/Phi-3-mini-4k-instruct-gguf" style={{ width: "100%", padding: "10px", marginTop: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} disabled={isDownloading}/>
                        </label>
                        <label style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>Exact .gguf Filename
                            <input required type="text" value={filename} onChange={e => setFilename(e.target.value)} placeholder="Phi-3-mini-4k-instruct-q4.gguf" style={{ width: "100%", padding: "10px", marginTop: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} disabled={isDownloading}/>
                        </label>
                        <label style={{ fontSize: "13px", color: "#64748b", fontWeight: 600, gridColumn: "1 / -1" }}>Display Name (Optional)
                            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Phi-3 Mini (Fast)" style={{ width: "100%", padding: "10px", marginTop: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} disabled={isDownloading}/>
                        </label>
                        
                        {isDownloading ? (
                            <div style={{ gridColumn: "1 / -1", background: "#f1f5f9", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                                <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>{downloadStatus}</div>
                                <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                                    <div style={{ width: `${downloadPercent}%`, height: '100%', background: '#2563eb', transition: 'width 0.2s' }} />
                                </div>
                            </div>
                        ) : (
                            <button type="submit" style={{ gridColumn: "1 / -1", padding: "12px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", fontWeight: "bold", cursor: "pointer" }}>Download Model</button>
                        )}
                    </form>
                </div>

                {/* Manage Downloaded Models */}
                <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
                    <h2 style={{ fontSize: "18px", margin: "0 0 15px 0", color: "#0f172a" }}>🔒 Local Models on Disk</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {(!config.local_models || config.local_models.length === 0) ? (
                            <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>No local models downloaded yet.</p>
                        ) : (
                            config.local_models.map((m, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>{m.name}</div>
                                        <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>{m.filename}</div>
                                    </div>
                                    <button onClick={() => deleteModel(m.filename)} style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48", padding: "8px", borderRadius: "6px", cursor: "pointer" }}>
                                        <IconTrash />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}