import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Workshop.css';
import useProjectStore from '../store/useProjectStore';
import { FileText, Bot } from 'lucide-react';

const Workshop = () => {
    const { projects, fetchAllProjects } = useProjectStore();
    const location = useLocation();

    const [messages, setMessages] = useState([
        { text: "Welcome to the DocBot Workshop! Select a document from your Active Artifacts or type your research question to begin.", sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [activeArtifacts, setActiveArtifacts] = useState([]);
    const [selectedArtifact, setSelectedArtifact] = useState(null);

    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchAllProjects();
    }, [fetchAllProjects]);

    useEffect(() => {
        // Collect all reconstructed files as artifacts
        const artifacts = [];
        if (projects && projects.length > 0) {
            projects.forEach(proj => {
                if (proj.files && proj.files.length > 0) {
                    proj.files.forEach(file => {
                        if (file.originalName && file.originalName.includes('_reconstructed')) {
                            artifacts.push({
                                ...file,
                                projectName: proj.name || proj.title || 'Untitled Project',
                                projectId: proj._id
                            });
                        }
                    });
                }
            });
            // Sort by most recently updated
            artifacts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            setActiveArtifacts(artifacts);

            // Auto-select artifact if passed in navigation state
            if (location.state?.activeArtifactId) {
                const target = artifacts.find(a => a._id === location.state.activeArtifactId);
                if (target) {
                    setSelectedArtifact(target);
                }
            }
        }
    }, [projects, location.state]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = { text: inputValue, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');

        // Mock AI response for now - logic depends on selected artifact
        setTimeout(() => {
            const contextMsg = selectedArtifact
                ? `I see you're asking about "${selectedArtifact.originalName}". I am analyzing the content...`
                : "Please select an artifact from the sidebar first so I have context for your request.";

            setMessages(prev => [...prev, {
                text: contextMsg,
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
                    {activeArtifacts.length === 0 ? (
                        <div className="empty-state">No active files found. Complete a document processing first.</div>
                    ) : (
                        <div className="artifact-list flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                            {activeArtifacts.map(artifact => (
                                <button
                                    key={artifact._id}
                                    onClick={() => setSelectedArtifact(artifact)}
                                    className={`flex items-start gap-3 p-3 rounded-lg text-left transition-colors border ${selectedArtifact?._id === artifact._id
                                        ? 'bg-[#fdfceb] border-[#e1d5a6] shadow-sm'
                                        : 'bg-white border-gray-100 hover:bg-gray-50'
                                        }`}
                                >
                                    <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${selectedArtifact?._id === artifact._id ? 'text-yellow-600' : 'text-gray-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-sm text-gray-800 truncate" title={artifact.originalName}>
                                            {artifact.originalName}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate" title={artifact.projectName}>
                                            {artifact.projectName}
                                        </div>
                                    </div>
                                    {selectedArtifact?._id === artifact._id && (
                                        <div className="shrink-0 flex items-center h-full">
                                            <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sidebar-footer">
                    <button className="export-master-btn" disabled={!selectedArtifact}>
                        {selectedArtifact ? 'Export Final Manuscript' : 'Select Artifact to Export'}
                    </button>
                </div>
            </aside>
        </div>
    );
};

export default Workshop;
