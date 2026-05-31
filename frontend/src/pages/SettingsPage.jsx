import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconHome, IconTrash } from '../components/Icons';

export default function SettingsPage() {
    const [config, setConfig] = useState(null);
    const [geminiKey, setGeminiKey] = useState('');


    const fetchConfig = () => {
        fetch('http://localhost:8000/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data.config);
                setGeminiKey(data.config.gemini_api_key || '');
            });
    };

    useEffect(() => { fetchConfig(); }, []);

    const saveApiKey = async () => {
        await fetch('http://localhost:8000/api/config', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gemini_api_key: geminiKey })
        });
        alert("API Key Saved!");
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

            </div>
        </div>
    );
}