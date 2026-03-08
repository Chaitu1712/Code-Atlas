import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconTrash, IconHome } from '../components/Icons';

export default function AllProjectsPage() {
    const [projects, setProjects] = useState([]);
    const navigate = useNavigate();

    const fetchProjects = () => fetch('http://localhost:8000/api/projects').then(res => res.json()).then(setProjects);
    useEffect(() => { fetchProjects(); }, []);

    const handleDelete = async (e, p) => {
        e.stopPropagation();
        if (window.confirm(`Delete data for "${p}"?`)) {
            await fetch(`http://localhost:8000/api/projects/${p}`, { method: 'DELETE' });
            fetchProjects();
        }
    };

    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "60px 20px", fontFamily: "Inter, sans-serif" }}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
                    <h1 style={{ fontSize: "32px", color: "#0f172a", margin: 0 }}>All Projects</h1>
                    <Link to="/" style={{ color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}><IconHome /> Home</Link>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {projects.map(p => (
                        <div key={p} onClick={() => navigate(`/visualize/${p}`)} style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "20px 24px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                            <h3 style={{ margin: 0, color: "#0f172a" }}>{p}</h3>
                            <button onClick={(e) => handleDelete(e, p)} style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#e11d48", padding: "8px", borderRadius: "8px", cursor: "pointer", display: "flex" }}>
                                <IconTrash />
                            </button>
                        </div>
                    ))}
                    {projects.length === 0 && <p style={{ color: "#64748b" }}>No projects found.</p>}
                </div>
            </div>
        </div>
    );
}