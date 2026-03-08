import React, { useState } from 'react';

export default function AddProjectModal({ onClose, onSuccess }) {
    const [name, setName] = useState('');
    const [path, setPath] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('http://localhost:8000/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: name.trim().replace(/\s+/g, '_'), directory: path.trim() })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || 'Failed to parse project');
            }
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                background: '#fff', padding: '30px', borderRadius: '16px', width: '400px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>Add New Project</h2>
                
                {error && <div style={{ color: '#e11d48', background: '#fff1f2', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <label style={{ display: 'block', marginBottom: '15px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                        Project Name
                        <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., my_cool_app"
                            style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                    </label>

                    <label style={{ display: 'block', marginBottom: '25px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                        Absolute Folder Path
                        <input required type="text" value={path} onChange={e => setPath(e.target.value)} placeholder="e.g., C:\Users\Name\Projects\App"
                            style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                    </label>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} disabled={isLoading} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                        <button type="submit" disabled={isLoading} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', cursor: isLoading ? 'wait' : 'pointer', fontWeight: 600 }}>
                            {isLoading ? 'Parsing & Embedding...' : 'Parse Codebase'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}