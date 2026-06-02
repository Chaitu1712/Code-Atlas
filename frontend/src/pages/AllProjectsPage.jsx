import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AddProjectModal from '../components/AddProjectModal';
import { IconPlus, IconTrash, IconPlay } from '../components/Icons';

export default function AllProjectsPage({ authFetch }) {
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    const fetchProjects = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        authFetch(`${apiUrl}/api/projects`)
            .then(res => res.json())
            .then(data => setProjects(data))
            .catch(err => console.error("Failed to load projects", err));
    };

    useEffect(() => { fetchProjects(); }, []);

    const handleDelete = async (e, p) => {
        e.stopPropagation(); // Prevent card click when clicking trash
        if (window.confirm(`Are you sure you want to permanently delete "${p}"?`)) {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            await authFetch(`${apiUrl}/api/projects/${p}`, { method: 'DELETE' });
            fetchProjects();
        }
    };

    // Alternating geometric background colors based on your palette
    const cardBlobs = ['#86f2e4', '#adc6ff', '#d8e2ff', '#ffdad6'];

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f7f9fb", padding: "64px 24px", fontFamily: "Inter, sans-serif" }}>
            {showModal && (
                <AddProjectModal 
                    authFetch={authFetch} 
                    onClose={() => setShowModal(false)} 
                    onSuccess={(newProject) => { setShowModal(false); navigate(`/visualize/${newProject}`); }} 
                />
            )}

            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                
                {/* Header Section */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "48px", flexWrap: "wrap", gap: "20px" }}>
                    <div>
                        <h1 style={{ fontSize: "48px", fontWeight: "700", color: "#191c1e", letterSpacing: "-0.02em", margin: "0 0 12px 0", lineHeight: "56px" }}>All Projects</h1>
                        <p style={{ color: "#717786", fontSize: "18px", margin: 0, fontWeight: "400" }}>Manage and visualize your parsed codebases.</p>
                    </div>
                    
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                        <Link to="/" style={{ color: "#717786", textDecoration: "none", fontWeight: "600", fontSize: "14px", letterSpacing: "0.01em" }}>
                            Cancel
                        </Link>
                        <button 
                            onClick={() => setShowModal(true)}
                            style={{ 
                                backgroundColor: "#0058bc", color: "#ffffff", border: "none", borderRadius: "4px", 
                                padding: "12px 24px", fontSize: "16px", fontWeight: "600", cursor: "pointer", 
                                display: "flex", alignItems: "center", gap: "8px", transition: "background-color 0.2s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#004493"}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = "#0058bc"}
                        >
                            <IconPlus /> New Project
                        </button>
                    </div>
                </div>

                {/* Projects Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: "24px" }}>
                    {projects.map((p, i) => (
                        <div 
                            key={p} 
                            onClick={() => navigate(`/visualize/${p}`)} 
                            style={{ 
                                position: "relative", backgroundColor: "rgb(238 241 243)", borderRadius: "12px", height: "180px",
                                padding: "24px", cursor: "pointer", overflow: "hidden", border: "1px solid transparent",
                                transition: "all 0.2s ease", display: "flex", flexDirection: "column"
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c1c6d7"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.06)"; }} 
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                        >

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", zIndex: 1 }}>
                                <h3 style={{ margin: 0, color: "#191c1e", fontSize: "24px", fontWeight: "600", letterSpacing: "-0.01em", maxWidth: "80%", wordWrap: "break-word" }}>
                                    {p}
                                </h3>
                                
                                <button 
                                    onClick={(e) => handleDelete(e, p)} 
                                    style={{ 
                                        backgroundColor: "#ffdad6", color: "#ba1a1a", border: "none", padding: "8px", 
                                        borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center",
                                        justifyContent: "center", transition: "background-color 0.2s" 
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#ffb4ab"}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "#ffdad6"}
                                    title="Delete Project"
                                >
                                    <IconTrash />
                                </button>
                            </div>

                            <div style={{ marginTop: "auto", zIndex: 1 }}>
                                <span style={{ 
                                    color: "#0058bc", fontSize: "14px", fontWeight: "600", display: "flex", 
                                    alignItems: "center", gap: "6px", letterSpacing: "0.01em" 
                                }}>
                                    Open Map <IconPlay />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {projects.length === 0 && (
                    <div style={{ textAlign: "center", padding: "80px 20px", backgroundColor: "#ffffff", border: "1px dashed #c1c6d7", borderRadius: "12px" }}>
                        <p style={{ color: "#717786", fontSize: "18px", fontWeight: "500", margin: "0 0 16px 0" }}>No projects parsed yet.</p>
                        <button 
                            onClick={() => setShowModal(true)}
                            style={{ backgroundColor: "transparent", color: "#0058bc", border: "none", fontSize: "16px", fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}
                        >
                            Parse your first codebase
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}