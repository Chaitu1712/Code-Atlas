import React, { useState } from 'react';

export default function AuthPage({ setToken }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        const endpoint = isLogin ? '/api/login' : '/api/register';
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        try {
            const res = await fetch(`${apiUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.detail || "Authentication failed");

            if (isLogin) {
                localStorage.setItem('codeAtlasToken', data.access_token);
                setToken(data.access_token);
            } else {
                alert("Registration successful! Please log in.");
                setIsLogin(true);
                setPassword('');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#0f172a", fontFamily: "Inter, sans-serif" }}>
            <div style={{ background: "#ffffff", padding: "40px", borderRadius: "16px", width: "350px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                <img src="../../public/logo.png" alt="Logo" style={{ width: "40px", height: "40px", marginRight: "10px", borderRadius: "10px" }} />
                <h1 style={{ margin: "0 0 5px 0", color: "#0f172a", textAlign: "center" }}>Code Atlas</h1>
                </div>
                <p style={{ color: "#64748b", textAlign: "center", marginBottom: "30px", fontSize: "14px" }}>
                    {isLogin ? "Welcome back, Architect." : "Create your account."}
                </p>

                {error && <div style={{ color: "#e11d48", background: "#fff1f2", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "13px", textAlign: "center" }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <input required type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
                    <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
                    <button type="submit" disabled={loading} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "none", background: "#2563eb", color: "#fff", fontWeight: "bold", cursor: loading ? "wait" : "pointer" }}>
                        {loading ? "..." : isLogin ? "Sign In" : "Register"}
                    </button>
                </form>

                <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px" }}>
                    <span style={{ color: "#64748b" }}>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: "bold", cursor: "pointer", marginLeft: "5px" }}>
                        {isLogin ? "Sign Up" : "Log In"}
                    </button>
                </div>
            </div>
        </div>
    );
}