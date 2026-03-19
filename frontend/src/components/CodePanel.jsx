import React, { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { IconClose, IconAuthor, IconModifier } from './Icons';

export default function CodePanel({ viewingCode, setViewingCode, isCodeLoading, currentProject }) {
    const [activeTab, setActiveTab] = useState('code'); // 'code' or 'chat'
    const [config, setConfig] = useState(null);
    const [selectedModel, setSelectedModel] = useState('');
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetch('http://localhost:8000/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data.config);
                setSelectedModel(data.config.mode === 'online' ? data.config.active_online_model : data.config.active_local_model);
            });
    }, []);

    useEffect(() => {
        if (viewingCode) setMessages([{ role: 'system', text: `Hi! I've loaded the architecture context for ${viewingCode.name}. What would you like to know?` }]);
        setActiveTab('code');
    }, [viewingCode?.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isThinking || !viewingCode) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsThinking(true);

        setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

        try {
            const response = await fetch(`http://localhost:8000/api/chat/${currentProject}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ node_id: viewingCode.id, message: userMsg, selected_model: selectedModel })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1].text += chunk;
                    return newMsgs;
                });
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: "\n\nError: Failed to connect to AI Engine." }]);
        } finally {
            setIsThinking(false);
        }
    };

    const availableModels = config?.mode === 'online' 
        ? [
            { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Fast)" },
            { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Smart)" }
          ]
        : (config?.local_models || []).map(m => ({ value: m.path, label: m.name }));

    if (!viewingCode) return null;

    return (
        <div style={{ position: "absolute", top: 24, right: 24, width: "500px", zIndex: 10, background: "#ffffff", border: "1px solid rgba(0, 0, 0, 0.08)", borderRadius: "16px", boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.1)", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 48px)" }}>
            
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#f8fafc", borderRadius: "16px 16px 0 0" }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "16px", fontWeight: 600 }}>{viewingCode.name || viewingCode.id.split('.').pop()}</h3>
                    
                    {/* TABS */}
                    <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                        <button onClick={() => setActiveTab('code')} style={{ padding: "6px 12px", border: "none", background: activeTab === 'code' ? "#e2e8f0" : "transparent", color: activeTab === 'code' ? "#0f172a" : "#64748b", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "12px" }}>Source Code</button>
                        <button onClick={() => setActiveTab('chat')} style={{ padding: "6px 12px", border: "none", background: activeTab === 'chat' ? "#dbeafe" : "transparent", color: activeTab === 'chat' ? "#2563eb" : "#64748b", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>Ask AI ✨</button>
                    </div>
                </div>
                <button onClick={() => setViewingCode(null)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><IconClose /></button>
            </div>
            
            {/* Content Area */}
            {activeTab === 'code' ? (
                <div style={{ padding: "0", flex: 1, overflowY: "auto", background: "#1e1e1e", borderRadius: "0 0 16px 16px" }}>
                    {isCodeLoading ? <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading syntax...</div> : viewingCode.code ? (
                        <SyntaxHighlighter language="python" style={vscDarkPlus} showLineNumbers={true} startingLineNumber={viewingCode.line_start} customStyle={{ margin: 0, padding: "20px", background: "transparent", fontSize: "13px" }}>{viewingCode.code}</SyntaxHighlighter>
                    ) : <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", background: "#f8fafc", height: "100%" }}>{viewingCode.message}</div>}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", background: "#f8fafc", borderRadius: "0 0 16px 16px" }}>
                    
                    {/* Model Selector Bar */}
                    <div style={{ padding: "8px 16px", background: "#ffffff", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>{config?.mode === 'online' ? '☁️ Cloud Engine' : '🔒 Local Engine'}</span>
                        <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", background: "#f8fafc" }}>
                            {availableModels.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            {availableModels.length === 0 && <option value="">No models available</option>}
                        </select>
                    </div>

                    {/* Chat History */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                        {messages.map((msg, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: msg.role === 'user' ? "flex-end" : "flex-start" }}>
                                <div style={{ 
                                    maxWidth: "85%", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap",
                                    background: msg.role === 'user' ? "#2563eb" : "#ffffff", 
                                    color: msg.role === 'user' ? "#ffffff" : "#0f172a",
                                    border: msg.role === 'user' ? "none" : "1px solid #e2e8f0",
                                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                }}>
                                    {msg.text}
                                    {msg.role === 'assistant' && msg.text === '' && isThinking && <span style={{ animation: "pulse 1s infinite" }}>● ● ●</span>}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleChatSubmit} style={{ padding: "16px", background: "#ffffff", borderTop: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input type="text" value={input} onChange={e => setInput(e.target.value)} disabled={isThinking || availableModels.length === 0} placeholder={availableModels.length === 0 ? "Download a model in Settings first..." : "Ask about this architecture..."} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px" }} />
                            <button type="submit" disabled={isThinking || !input.trim() || availableModels.length === 0} style={{ padding: "0 16px", borderRadius: "8px", border: "none", background: "#0f172a", color: "#fff", fontWeight: 600, cursor: isThinking ? "wait" : "pointer", opacity: (!input.trim() || isThinking || availableModels.length === 0) ? 0.5 : 1 }}>Send</button>
                        </div>
                    </form>

                </div>
            )}
        </div>
    );
}