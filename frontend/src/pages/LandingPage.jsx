import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AddProjectModal from '../components/AddProjectModal';
import { IconAdd } from '../components/Icons';

export default function LandingPage() {
    const [projects, setProjects] = useState([]);
    const [recentProjects, setRecentProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const fetchProjects = () => {
        fetch('http://localhost:8000/api/projects')
            .then(res => res.json())
            .then(data => {
                setProjects(data);
                // Load recent from local storage
                const savedRecents = JSON.parse(localStorage.getItem('codeAtlasRecents') || '[]');
                // Filter recents to only show projects that still actually exist
                setRecentProjects(savedRecents.filter(p => data.includes(p)).slice(0, 3));
            });
    };

    useEffect(() => { fetchProjects(); }, []);

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "60px 20px", fontFamily: "Inter, sans-serif" }}>
            {showModal && <AddProjectModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchProjects(); }} />}
            
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <h1 style={{ fontSize: "36px", color: "#0f172a", marginBottom: "10px" }}>Code Atlas</h1>
                <p style={{ color: "#64748b", fontSize: "16px", marginBottom: "40px" }}>Select a codebase to visualize its architecture and query it using AI.</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "40px" }}>
                    
                    {/* Add New Project Card */}
                    <div onClick={() => setShowModal(true)} style={{ background: "#ffffff", border: "1px dashed #cbd5e1", borderRadius: "12px", padding: "30px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#2563eb"} onMouseLeave={e => e.currentTarget.style.borderColor = "#cbd5e1"}>
                        <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "50%", marginBottom: "15px" }}><IconAdd /></div>
                        <h3 style={{ margin: 0, color: "#2563eb" }}>Parse New Codebase</h3>
                        <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: "8px", textAlign: "center" }}>Point to a local folder to extract AST & embeddings.</p>
                    </div>

                    {/* Instructions Card */}
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "30px" }}>
                        <h3 style={{ margin: "0 0 15px 0", color: "#0f172a" }}>Getting Started</h3>
                        <ul style={{ color: "#64748b", fontSize: "14px", paddingLeft: "20px", margin: 0, lineHeight: "1.6" }}>
                            <li>Click "Parse New Codebase".</li>
                            <li>Provide a name and an absolute path (e.g. <code>C:\Projects\App</code>).</li>
                            <li>Wait for the AST and Vector extraction to complete.</li>
                            <li>Select the project below to view the interactive graph.</li>
                        </ul>
                    </div>
                </div>

                {/* Recent Projects */}
                {recentProjects.length > 0 && (
                    <div style={{ marginBottom: "40px" }}>
                        <h2 style={{ fontSize: "20px", color: "#0f172a", marginBottom: "15px" }}>Jump Back In</h2>
                        <div style={{ display: "flex", gap: "15px" }}>
                            {recentProjects.map(p => (
                                <div key={p} onClick={() => navigate(`/visualize/${p}`)} style={{ flex: 1, background: "#ffffff", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "12px", cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                                    <h3 style={{ margin: 0, color: "#0f172a" }}>{p}</h3>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Link to all projects */}
                <div style={{ textAlign: "center", borderTop: "1px solid #e2e8f0", paddingTop: "30px" }}>
                    <Link to="/projects" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>Browse All {projects.length} Projects →</Link>
                </div>
            </div>
        </div>
    );
}