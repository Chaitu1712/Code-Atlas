import React, { useState, useEffect } from 'react';

export default function AddProjectModal({ onClose, onSuccess }) {
    const [name, setName] = useState('');
    const [path, setPath] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [progressStatus, setProgressStatus] = useState('');
    const [progressMessage, setProgressMessage] = useState('');
    const [progressPercent, setProgressPercent] = useState(0);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws/progress');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setProgressStatus(data.status);
            setProgressMessage(data.message);
            setProgressPercent(data.percent);
        };
        return () => ws.close();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true); setError(''); setProgressPercent(0);

        try {
            const res = await fetch('http://localhost:8000/api/projects', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: name.trim().replace(/\s+/g, '_'), directory: path.trim() })
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to parse project');
            setTimeout(() => onSuccess(), 500);
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', width: '400px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <h2 style={{ margin: '0 0 20px 0', color: '#0f172a' }}>Add New Project</h2>
                
                {error && <div style={{ color: '#e11d48', background: '#fff1f2', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '13px' }}>{error}</div>}

                {!isLoading ? (
                    <form onSubmit={handleSubmit}>
                        <label style={{ display: 'block', marginBottom: '15px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                            Project Name <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., core_backend" style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                        </label>
                        <label style={{ display: 'block', marginBottom: '25px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                            Absolute Folder Path <input required type="text" value={path} onChange={e => setPath(e.target.value)} placeholder="e.g., C:\Users\Dev\App" style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} />
                        </label>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                            <button type="submit" style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Parse Codebase</button>
                        </div>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>{progressStatus || 'Starting...'}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px', height: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{progressMessage}</div>
                        
                        <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPercent}%`, height: '100%', background: '#2563eb', transition: 'width 0.2s ease-out' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontWeight: 'bold' }}>{progressPercent}%</div>
                    </div>
                )}
            </div>
        </div>
    );
}