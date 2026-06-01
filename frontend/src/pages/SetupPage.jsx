import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SetupPage() {
    const [mode, setMode] = useState('online');
    const [geminiKey, setGeminiKey] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();


    const handleSetup = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMode('online');
        await fetch(import.meta.env.VITE_API_URL + '/api/config', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, gemini_api_key: geminiKey })
        });
        
        window.location.href = '/';
    };

    return (
        <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Inter, sans-serif" }}>
            <div style={{ background: "#ffffff", padding: "40px", borderRadius: "16px", width: "500px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
                <h1 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "24px" }}>Welcome to Code Atlas</h1>
                <p style={{ color: "#64748b", marginBottom: "30px", fontSize: "14px" }}>Configure your AI Engine to start querying your architecture.</p>


                <form onSubmit={handleSetup}>
                    {(
                        <label style={{ display: "block", marginBottom: "20px", fontSize: "13px", color: "#475569", fontWeight: 600 }}>
                            Google Gemini API Key (Free)
                            <input required type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{ width: "100%", padding: "12px", marginTop: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} />
                        </label>
                    )}

                    <button type="submit" disabled={isSaving || (mode === 'online' && !geminiKey)} style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: isSaving ? "#94a3b8" : "#0f172a", color: "white", fontWeight: 600, cursor: isSaving ? "wait" : "pointer" }}>
                        {isSaving ? "Saving Configuration..." : "Complete Setup"}
                    </button>
                </form>
            </div>
        </div>
    );
}