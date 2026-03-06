import React, { useState, useRef, useEffect } from 'react';
import './Workshop.css';

const Workshop = () => {
    const [messages, setMessages] = useState([
        { text: "Welcome to the Advanced Workshop! Upload a .docx file or type your research question to begin.", sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = { text: inputValue, sender: 'user' };
        setMessages([...messages, userMsg]);
        setInputValue('');

        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                text: "I've started analyzing your request in the workshop workspace. How should we proceed with your document?",
                sender: 'bot'
            }]);
        }, 1000);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIsUploading(true);
            setTimeout(() => {
                setMessages(prev => [...prev, {
                    text: `Successfully imported: ${file.name}. Ready for advanced processing.`,
                    sender: 'bot'
                }]);
                setIsUploading(false);
            }, 1500);
        }
    };

    return (
        <div className="workshop-container">
            <div className="workshop-main">
                <header className="workshop-header">
                    <div className="header-left">
                        <h1>🚀 Advanced Workshop</h1>
                        <span className="status-badge">Live Analysis</span>
                    </div>
                    <div className="header-actions">
                        <button className="import-btn" onClick={() => fileInputRef.current.click()}>
                            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                            Import .docx
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".docx"
                            onChange={handleFileUpload}
                        />
                    </div>
                </header>

                <div className="workshop-chat-area">
                    <div className="messages-container">
                        {messages.map((msg, i) => (
                            <div key={i} className={`workshop-msg ${msg.sender}`}>
                                <div className="msg-avatar">
                                    {msg.sender === 'bot' ? '🤖' : '👤'}
                                </div>
                                <div className="msg-bubble">{msg.text}</div>
                            </div>
                        ))}
                        {isUploading && (
                            <div className="workshop-msg bot">
                                <div className="msg-avatar">🤖</div>
                                <div className="msg-bubble uploading">Analyzing document...</div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <form className="workshop-input-container" onSubmit={handleSend}>
                        <textarea
                            className="large-input"
                            placeholder="Type or paste your complex research prompt here..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    handleSend(e);
                                }
                            }}
                        />
                        <button type="submit" className="huge-send-btn">
                            Send Prompt
                            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                        </button>
                    </form>
                </div>
            </div>

            <aside className="workshop-sidebar">
                <div className="sidebar-group">
                    <h3>Workshop Tools</h3>
                    <div className="tool-grid">
                        <button className="tool-card">
                            <span className="tool-icon">📝</span>
                            <span>Format Doc</span>
                        </button>
                        <button className="tool-card">
                            <span className="tool-icon">🔍</span>
                            <span>Deep Scan</span>
                        </button>
                        <button className="tool-card">
                            <span className="tool-icon">📊</span>
                            <span>Cite Check</span>
                        </button>
                        <button className="tool-card">
                            <span className="tool-icon">🌓</span>
                            <span>Contrast</span>
                        </button>
                    </div>
                </div>

                <div className="sidebar-group">
                    <h3>Active Artifacts</h3>
                    <div className="empty-state">No active files</div>
                </div>

                <div className="sidebar-footer">
                    <button className="export-master-btn">Export Final Manuscript</button>
                </div>
            </aside>
        </div>
    );
};

export default Workshop;
