import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { IconHome, IconCloud, IconShield, IconPalette, IconLock } from '../components/Icons';

export default function SettingsPage({ authFetch }) {
    const [activeTab, setActiveTab] = useState('auth'); // 'cloud', 'auth', 'appearance'
    const [config, setConfig] = useState(null);
    const [geminiKey, setGeminiKey] = useState('');
    
    // Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [authMessage, setAuthMessage] = useState({ type: '', text: '' });
    const [isSavingAuth, setIsSavingAuth] = useState(false);

    useEffect(() => {
        authFetch('http://localhost:8000/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data.config);
                setGeminiKey(data.config.gemini_api_key || '');
            });
    }, [authFetch]);

    const saveApiKey = async () => {
        await authFetch('http://localhost:8000/api/config', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gemini_api_key: geminiKey })
        });
        alert("API Key Saved!");
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setAuthMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setAuthMessage({ type: 'error', text: "Passwords do not match." });
            return;
        }

        setIsSavingAuth(true);
        try {
            const res = await authFetch('http://localhost:8000/api/change-password', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: newPassword })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.detail || "Failed to update password.");
            
            setAuthMessage({ type: 'success', text: "Password updated successfully!" });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setAuthMessage({ type: 'error', text: err.message });
        } finally {
            setIsSavingAuth(false);
        }
    };

    if (!config) return <div style={{ background: "#f8fafc", height: "100vh" }} />;

    return (
        <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "60px 20px", fontFamily: "Inter, sans-serif" }}>
            <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
                
                {/* Header */}
                <div style={{ marginBottom: "40px" }}>
                    <h1 style={{ fontSize: "32px", color: "#0f172a", margin: "0 0 8px 0", fontWeight: 800 }}>Settings</h1>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                            Configure your environment, external integrations, and API accesses for the Atlas engine.
                        </p>
                        <Link to="/" style={{ color: "#2563eb", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                            <IconHome /> Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* Main Layout: Sidebar + Content */}
                <div style={{ display: "flex", gap: "30px", alignItems: "flex-start" }}>
                    
                    {/* Left Sidebar */}
                    <div style={{ width: "240px", background: "#ffffff", borderRadius: "12px", padding: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px", paddingLeft: "12px" }}>
                            Configuration
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <button onClick={() => setActiveTab('cloud')} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", border: "none", background: activeTab === 'cloud' ? "#f8fafc" : "transparent", color: activeTab === 'cloud' ? "#0f172a" : "#64748b", fontWeight: activeTab === 'cloud' ? 600 : 500, borderRadius: "8px", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                                <IconCloud /> Cloud Provider
                            </button>
                            <button onClick={() => setActiveTab('auth')} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", border: "none", background: activeTab === 'auth' ? "#f8fafc" : "transparent", color: activeTab === 'auth' ? "#0f172a" : "#64748b", fontWeight: activeTab === 'auth' ? 600 : 500, borderRadius: "8px", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                                <IconShield /> Security & Auth
                            </button>
                            <button onClick={() => setActiveTab('appearance')} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", border: "none", background: activeTab === 'appearance' ? "#f8fafc" : "transparent", color: activeTab === 'appearance' ? "#0f172a" : "#64748b", fontWeight: activeTab === 'appearance' ? 600 : 500, borderRadius: "8px", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                                <IconPalette /> Appearance
                            </button>
                        </div>
                    </div>

                    {/* Right Content Area */}
                    <div style={{ flex: 1, background: "#ffffff", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                        
                        {/* Decorative Top Gradient Line */}
                        <div style={{ height: "4px", width: "100%", background: "linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)" }}></div>

                        <div style={{ padding: "32px" }}>
                            {/* --- TAB: SECURITY & AUTH --- */}
                            {activeTab === 'auth' && (
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                        <div style={{ background: "#f1f5f9", padding: "8px", borderRadius: "8px" }}><IconShield /></div>
                                        <h2 style={{ fontSize: "20px", margin: 0, color: "#0f172a" }}>Security & Auth</h2>
                                    </div>
                                    <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "32px" }}>
                                        Manage your account security and authentication settings.
                                    </p>

                                    {authMessage.text && (
                                        <div style={{ padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "13px", background: authMessage.type === 'error' ? "#fff1f2" : "#ecfdf5", color: authMessage.type === 'error' ? "#e11d48" : "#059669", border: `1px solid ${authMessage.type === 'error' ? '#fecdd3' : '#a7f3d0'}` }}>
                                            {authMessage.text}
                                        </div>
                                    )}

                                    <form onSubmit={handlePasswordChange}>
                                        <label style={{ display: "block", marginBottom: "20px" }}>
                                            <span style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "8px" }}>New Password</span>
                                            <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 12px", background: "#f8fafc", focusWithin: { borderColor: "#2563eb" } }}>
                                                <IconLock />
                                                <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••••••" style={{ width: "100%", padding: "12px", border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
                                            </div>
                                        </label>

                                        <label style={{ display: "block", marginBottom: "24px" }}>
                                            <span style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "8px" }}>Confirm Password</span>
                                            <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 12px", background: "#f8fafc" }}>
                                                <IconLock />
                                                <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••••••" style={{ width: "100%", padding: "12px", border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
                                            </div>
                                        </label>

                                        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                                            <button type="submit" disabled={isSavingAuth} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "#0f766e", color: "white", fontWeight: "bold", cursor: isSavingAuth ? "wait" : "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(15, 118, 110, 0.2)" }}>
                                                {isSavingAuth ? "Saving..." : "💾 Save Password"}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* --- TAB: CLOUD PROVIDER --- */}
                            {activeTab === 'cloud' && (
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                        <div style={{ background: "#f1f5f9", padding: "8px", borderRadius: "8px" }}><IconCloud /></div>
                                        <h2 style={{ fontSize: "20px", margin: 0, color: "#0f172a" }}>Cloud Provider</h2>
                                    </div>
                                    <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "32px" }}>
                                        Configure external LLM providers to power the Code Atlas AI engine.
                                    </p>

                                    <label style={{ display: "block", marginBottom: "20px" }}>
                                        <span style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "8px" }}>Google Gemini API Key</span>
                                        <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0 12px", background: "#f8fafc" }}>
                                            <IconLock />
                                            <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{ width: "100%", padding: "12px", border: "none", background: "transparent", outline: "none", fontSize: "14px" }} />
                                        </div>
                                    </label>

                                    <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "20px" }}>
                                        <button onClick={saveApiKey} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: "#0f766e", color: "white", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px -1px rgba(15, 118, 110, 0.2)" }}>
                                            💾 Save API Key
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: APPEARANCE --- */}
                            {activeTab === 'appearance' && (
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                                        <div style={{ background: "#f1f5f9", padding: "8px", borderRadius: "8px" }}><IconPalette /></div>
                                        <h2 style={{ fontSize: "20px", margin: 0, color: "#0f172a" }}>Appearance</h2>
                                    </div>
                                    <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "32px" }}>
                                        Customize the visual theme of the Code Atlas interface.
                                    </p>
                                    <div style={{ padding: "30px", border: "1px dashed #cbd5e1", borderRadius: "8px", textAlign: "center", color: "#94a3b8" }}>
                                        Dark Mode toggle coming soon.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}