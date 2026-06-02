import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AddProjectModal from '../components/AddProjectModal';
import { IconHistory, IconFolder, IconAdd, IconRocket, IconLogout } from '../components/Icons';

export default function LandingPage({ authFetch, handleLogout }) {
    const [projects, setProjects] = useState([]);
    const [recentProjects, setRecentProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const fetchProjects = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        authFetch(`${apiUrl}/api/projects`)
            .then(res => res.json())
            .then(data => {
                setProjects(data);
                const savedRecents = JSON.parse(localStorage.getItem('codeAtlasRecents') || '[]');
                setRecentProjects(savedRecents.filter(p => data.includes(p)).slice(0, 3));
            })
            .catch(() => {});
    };

    useEffect(() => { fetchProjects(); }, []);

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f7f9fb", padding: "64px 24px", fontFamily: "Inter, sans-serif" }}>
            {showModal && (
                <AddProjectModal 
                    authFetch={authFetch} 
                    onClose={() => setShowModal(false)} 
                    onSuccess={(newProjectName) => { 
                        setShowModal(false); 
                        navigate(`/visualize/${newProjectName}`); 
                    }} 
                />
            )}
            
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                
                <div style={{  display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "64px" }}>
                    <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "0" }}>
                    <img src="/logo.png" alt="Code Atlas Logo" style={{ width: "48px", height: "48px", marginBottom: "0", borderRadius: "25%" }} />
                    <h1 style={{ fontSize: "48px", fontWeight: "700", color: "#191c1e", letterSpacing: "-0.02em", margin: "0 0 0 0", lineHeight: "56px" }}>Code Atlas</h1>
                    </div>
                    <p style={{ color: "#414755", fontSize: "18px", margin: "8px 0 0 0", fontWeight: "400", lineHeight: "28px" }}>The architecture map for complex codebases.</p>
                    </div>
                    <button 
                        onClick={handleLogout}
                        title="Sign Out"
                        style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            backgroundColor: "#ffffff", color: "#ba1a1a", border: "1px solid #e0e3e5",
                            borderRadius: "8px", padding: "10px 16px", fontSize: "14px", fontWeight: "600",
                            cursor: "pointer", transition: "all 0.2s ease", boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#ffdad6"; e.currentTarget.style.borderColor = "#ffdad6"; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ffffff"; e.currentTarget.style.borderColor = "#e0e3e5"; }}
                    >
                        Sign Out <IconLogout />
                    </button>
                </div>

                <div style={{ display: "flex", gap: "32px", marginBottom: "64px", flexWrap: "wrap" }}>
                    
                    <div 
                        onClick={() => setShowModal(true)} 
                        style={{ 
                            flex: "1 1 600px", backgroundColor: "#ffffff", border: "1px dashed #c1c6d7", 
                            borderRadius: "12px", padding: "64px 32px", display: "flex", flexDirection: "column", 
                            alignItems: "center", justifyContent: "center", cursor: "pointer", 
                            transition: "all 0.2s ease-in-out" 
                        }} 
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#0058bc"; e.currentTarget.style.backgroundColor = "#f2f4f6"; }} 
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#c1c6d7"; e.currentTarget.style.backgroundColor = "#ffffff"; }}
                    >
                        <div style={{ backgroundColor: "#d8e2ff", color: "#0058bc", width: "56px", height: "56px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
                            <IconAdd />
                        </div>
                        <h3 style={{ margin: 0, color: "#0058bc", fontSize: "24px", fontWeight: "600", letterSpacing: "-0.01em" }}>Parse New Codebase</h3>
                        <p style={{ color: "#414755", fontSize: "16px", marginTop: "12px", textAlign: "center" }}>Point to a GitHub repository to extract AST & embeddings.</p>
                    </div>

                    <div style={{ 
                        flex: "0 0 380px", backgroundColor: "#ffffff", borderRadius: "12px", padding: "32px", 
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)", border: "1px solid #e0e3e5" 
                    }}>
                        <h3 style={{ margin: "0 0 24px 0", color: "#191c1e", fontSize: "24px", fontWeight: "600", display: "flex", alignItems: "center", gap: "12px" }}>
                            <IconRocket /> Getting Started
                        </h3>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {[
                                { step: 1, text: <>Click <span style={{ color: "#0058bc" }}>"Parse New Codebase"</span>.</> },
                                { step: 2, text: <>Provide a name and a GitHub repository URL.<br/><span style={{ backgroundColor: "#f3e8ff", color: "#7e22ce", padding: "2px 6px", borderRadius: "4px", fontFamily: "monospace", fontSize: "12px", display: "inline-block", marginTop: "8px" }}>https://github.com/user/repo.git</span></> },
                                { step: 3, text: "Wait for the AST and Vector extraction to complete." },
                                { step: 4, text: "Select the project below to view the interactive graph." }
                            ].map((item, idx) => (
                                <div key={idx} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#f2f4f6", color: "#414755", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "600", flexShrink: 0, marginTop: "2px" }}>
                                        {item.step}
                                    </div>
                                    <div style={{ fontSize: "14px", color: "#414755", lineHeight: "20px", fontWeight: "500" }}>
                                        {item.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Jump Back In Section */}
                {recentProjects.length > 0 && (
                    <div style={{ marginBottom: "48px" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#191c1e", display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", letterSpacing: "-0.01em" }}>
                            <IconHistory /> Jump Back In
                        </h2>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
                            {recentProjects.map((p, i) => {
                                return (
                                    <div 
                                        key={p} 
                                        onClick={() => navigate(`/visualize/${p}`)} 
                                        style={{ 
                                            backgroundColor: "#ffffff", border: "1px solid #e0e3e5", padding: "24px", 
                                            borderRadius: "12px", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                                            transition: "all 0.2s ease", display: "flex", flexDirection: "column"
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#0058bc"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.06)"; }} 
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e0e3e5"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.02)"; }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                                            <div style={{ backgroundColor: "#f2f4f6", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <IconFolder />
                                            </div>
                                        </div>
                                        
                                        <h3 style={{ margin: "0 0 16px 0", color: "#191c1e", fontSize: "18px", fontWeight: "600" }}>{p}</h3>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div style={{ textAlign: "center", borderTop: "1px solid #e0e3e5", paddingTop: "32px" }}>
                    <Link 
                        to="/projects" 
                        style={{ color: "#0058bc", textDecoration: "none", fontWeight: "600", fontSize: "14px", letterSpacing: "0.05em", textTransform: "uppercase" }}
                    >
                        Browse All {projects.length} Projects ➔
                    </Link>
                </div>
                
            </div>
        </div>
    );
}