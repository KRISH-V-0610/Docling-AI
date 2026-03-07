import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Upload, Download, RefreshCw, Send, Loader2,
    Bot, Trash2, AlertTriangle, MessageSquare, Sparkles,
    RotateCcw, ChevronRight, File
} from 'lucide-react';
import { Button } from '../components/Button';
import axios from 'axios';

const API_BASE = "http://localhost:8080";

/* ─── Helpers ──────────────────────────────────────────── */
function formatBytes(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(timestamp) {
    if (!timestamp) return '';
    const diff = Date.now() / 1000 - timestamp;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

/* ═══════════════════════════════════════════════════════ */
export function AdvanceWorkspace() {
    /* ── State ── */
    const [sessionId] = useState(() =>
        localStorage.getItem('agentSessionId') || `ui-${Math.random().toString(36).substr(2, 9)}`
    );
    const [docs, setDocs] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState(() => {
        const saved = localStorage.getItem('agentChatHistory');
        if (saved) { try { return JSON.parse(saved); } catch (e) { /* noop */ } }
        return [{
            id: 'init', role: 'bot',
            text: "Hi! I'm DocBot 🤖 — Tell me what you'd like to change in your documents!",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];
    });
    const [isSending, setIsSending] = useState(false);

    const [previewHtml, setPreviewHtml] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);

    const chatScrollRef = useRef(null);
    const fileInputRef = useRef(null);

    /* ── Persist ── */
    useEffect(() => {
        localStorage.setItem('agentChatHistory', JSON.stringify(chatHistory));
        localStorage.setItem('agentSessionId', sessionId);
    }, [chatHistory, sessionId]);

    /* ── Fetch Docs ── */
    const fetchDocuments = async () => {
        try {
            const res = await axios.get(`${API_BASE}/documents`);
            setDocs(res.data || []);
        } catch (e) {
            console.error('Error fetching docs', e);
        }
    };

    useEffect(() => { fetchDocuments(); }, []);

    useEffect(() => {
        if (chatScrollRef.current)
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, [chatHistory, isSending]);

    /* ── File Selection ── */
    const handleSelectFile = (filename, corrupted) => {
        if (corrupted) return;          // don't select corrupted files
        setSelectedFile(filename);
        setChatInput('');
        refreshPreview(filename);
    };

    /* ── Preview ── */
    const refreshPreview = async (name = selectedFile) => {
        if (!name) return;
        setPreviewLoading(true);
        setPreviewError(null);
        try {
            const res = await axios.get(`${API_BASE}/documents/${name}/preview`, { responseType: 'text' });
            setPreviewHtml(res.data);
        } catch (e) {
            const detail = e.response?.data?.detail || e.response?.statusText || e.message;
            setPreviewError(detail);
        } finally {
            setPreviewLoading(false);
        }
    };

    /* ── Upload ── */
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post(`${API_BASE}/documents/upload`, formData);
            if (res.data?.filename) {
                await fetchDocuments();
                handleSelectFile(res.data.filename, false);
            }
        } catch (err) {
            alert('Upload Error: ' + (err.response?.data?.detail || err.message));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    /* ── Download ── */
    const handleDownload = () => {
        if (selectedFile) window.location.href = `${API_BASE}/documents/${selectedFile}/download`;
    };

    /* ── Delete ── */
    const handleDeleteDocument = async (e, filename) => {
        e.stopPropagation();
        if (!window.confirm(`Delete "${filename}"?`)) return;
        setDeleting(filename);
        try {
            await axios.delete(`${API_BASE}/documents/${filename}`);
            if (selectedFile === filename) {
                setSelectedFile(null);
                setPreviewHtml(null);
            }
            await fetchDocuments();
        } catch (err) {
            alert('Delete Error: ' + (err.response?.data?.detail || err.message));
        } finally {
            setDeleting(null);
        }
    };

    /* ── Clear Chat ── */
    const handleClearChat = () => {
        setChatHistory([{
            id: 'init', role: 'bot',
            text: "Chat cleared! 🧹 Tell me what to do.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    };

    /* ── Chat ── */
    const handleSendMessage = async () => {
        const text = chatInput.trim();
        if (!text) return;

        const userMsg = {
            id: Date.now().toString(), role: 'user', text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput('');
        setIsSending(true);

        const msgPayload = selectedFile ? `[Working on file: ${selectedFile}]\n\n${text}` : text;

        try {
            const res = await axios.post(`${API_BASE}/chat`, {
                message: msgPayload, user_id: 'local_ui_user', session_id: sessionId
            }, { timeout: 45000 });

            let responseText = res.data?.response || 'No response generated.';
            responseText = responseText
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                .replace(/\*(.*?)\*/g, '<i>$1</i>')
                .replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>');

            setChatHistory(prev => [...prev, {
                id: Date.now().toString(), role: 'bot', textHtml: responseText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

            await fetchDocuments();
            if (selectedFile) setTimeout(() => refreshPreview(selectedFile), 600);
        } catch (err) {
            const errMsg = err.code === 'ECONNABORTED' ? 'Request timed out' : err.message;
            setChatHistory(prev => [...prev, {
                id: Date.now().toString(), role: 'bot',
                textHtml: `<span style="color:#ef4444;font-weight:600;">⚠️ ${errMsg}</span>`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsSending(false);
        }
    };

    /* ═══════════════ RENDER ═══════════════ */
    return (
        <div className="flex h-[calc(100vh-120px)] rounded-2xl overflow-hidden border border-[var(--color-surface-200)] shadow-lg bg-white">

            {/* ── LEFT PANEL: DocBot AI Chat ── */}
            <div className="w-[320px] shrink-0 flex flex-col border-r border-[var(--color-surface-200)] bg-white min-h-0">
                {/* Chat Header */}
                <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white shrink-0">
                    <h3 className="text-[13px] font-bold flex items-center gap-2 tracking-wide uppercase">
                        
                        DocBot AI
                    </h3>
                    <button
                        onClick={handleClearChat}
                        className="text-[10px] font-medium flex items-center gap-1 px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                        title="Clear chat"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Clear
                    </button>
                </div>

                {/* Messages */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 bg-gradient-to-b from-[var(--color-surface-50)] to-white min-h-0">
                    {chatHistory.map(msg => {
                        const isUser = msg.role === 'user';
                        return (
                            <div key={msg.id} className={`flex gap-2.5 max-w-[95%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                {/* Avatar */}
                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 shadow-sm ${isUser
                                        ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-600)]'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {isUser
                                        ? <ChevronRight className="w-4 h-4" />
                                        : <Bot className="w-4 h-4" />
                                    }
                                </div>
                                {/* Bubble */}
                                <div className="flex flex-col">
                                    <div className={`px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${isUser
                                            ? 'bg-[var(--color-primary-600)] text-white rounded-2xl rounded-tr-md'
                                            : 'bg-white border border-[var(--color-surface-200)] text-[var(--color-text-main)] rounded-2xl rounded-tl-md'
                                        }`}>
                                        {msg.textHtml
                                            ? <div dangerouslySetInnerHTML={{ __html: msg.textHtml }} />
                                            : msg.text
                                        }
                                    </div>
                                    <span className={`text-[10px] text-[var(--color-text-muted)] mt-1 ${isUser ? 'text-right' : ''} px-1`}>{msg.time}</span>
                                </div>
                            </div>
                        );
                    })}
                    {isSending && (
                        <div className="flex gap-2.5 self-start max-w-[95%]">
                            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 mt-0.5 shadow-sm">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="px-4 py-3 bg-white border border-[var(--color-surface-200)] rounded-2xl rounded-tl-md shadow-sm flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="px-4 py-3 bg-white border-t border-[var(--color-surface-200)] shrink-0">
                    <div className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder={selectedFile ? `Edit ${selectedFile}…` : 'Select a file first…'}
                            disabled={!selectedFile || isSending}
                            className="flex-1 px-4 py-2 text-[13px] bg-[var(--color-surface-50)] border border-[var(--color-surface-200)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-primary-200)] focus:border-[var(--color-primary-400)] transition-all disabled:opacity-50"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim() || !selectedFile || isSending}
                            className="shrink-0 w-10 h-10 rounded-xl bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-sm"
                        >
                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CENTER PANEL: Live Preview ── */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
                {/* Preview Header */}
                <div className="px-6 py-3.5 bg-white border-b border-[var(--color-surface-200)] flex items-center justify-between shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-50)] rounded-xl">
                            <FileText className="w-6 h-6 text-[var(--color-primary-600)]" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                                Document Preview
                            </h2>
                            <p className="text-[11px] text-[var(--color-text-muted)] truncate font-medium">
                                {selectedFile || 'No file selected'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {selectedFile && (
                            <Button variant="secondary" size="sm" onClick={handleDownload} className="h-9 gap-2 text-xs font-semibold px-4">
                                <Download className="w-4 h-4" />
                                Download
                            </Button>
                        )}
                        <Button
                            variant="primary" size="sm"
                            onClick={() => refreshPreview()}
                            disabled={!selectedFile || previewLoading}
                            className="h-9 gap-2 text-xs font-semibold px-4"
                        >
                            <RefreshCw className={`w-4 h-4 ${previewLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Preview Body */}
                <div className="flex-1 overflow-y-auto p-10 relative min-h-0 scroll-smooth">
                    {/* Loading overlay */}
                    {previewLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-4 bg-white p-10 rounded-2xl shadow-2xl border border-[var(--color-surface-200)]">
                                <Loader2 className="w-12 h-12 animate-spin text-[var(--color-primary-500)]" />
                                <span className="font-bold text-sm text-[var(--color-text-main)] animate-pulse tracking-wide uppercase">Updating Preview…</span>
                            </div>
                        </div>
                    )}

                    {!selectedFile ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] opacity-60">
                            <div className="w-24 h-24 rounded-full bg-[var(--color-surface-100)] flex items-center justify-center mb-6 border border-[var(--color-surface-200)]">
                                <FileText className="w-12 h-12 text-[var(--color-surface-300)]" strokeWidth={1} />
                            </div>
                            <p className="font-bold text-lg mb-1">Interactive Workspace</p>
                            <p className="text-sm">Select a document from the right to begin editing.</p>
                        </div>
                    ) : previewError ? (
                        <div className="max-w-lg mx-auto mt-20">
                            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center shadow-md">
                                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <p className="text-red-800 font-bold text-lg mb-2">Could Not Load Preview</p>
                                <p className="text-sm text-red-600 leading-relaxed font-medium">{previewError}</p>
                            </div>
                        </div>
                    ) : previewHtml ? (
                        <div
                            className="bg-white mx-auto rounded-lg shadow-2xl border border-[var(--color-surface-200)] transition-all duration-500"
                            style={{
                                maxWidth: 850,
                                padding: '80px 80px 100px',
                                minHeight: 1100,
                                opacity: previewLoading ? 0.3 : 1,
                                transform: previewLoading ? 'scale(0.98)' : 'scale(1)',
                            }}
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    ) : null}
                </div>
            </div>

            {/* ── RIGHT PANEL: Documents Library ── */}
            <div className="w-[280px] shrink-0 flex flex-col border-l border-[var(--color-surface-200)] bg-white min-h-0">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white shrink-0">
                    <h3 className="text-[13px] font-bold flex items-center gap-2 tracking-wide uppercase">
                        <File className="w-4 h-4 opacity-80" />
                        Documents
                    </h3>
                    <span className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-full">{docs.length}</span>
                </div>

                {/* Upload */}
                <div className="px-4 pt-4 pb-2 shrink-0">
                    <label className={`flex flex-col items-center justify-center gap-2 w-full p-4 text-xs font-bold rounded-xl border-2 border-dashed transition-all cursor-pointer shadow-sm
                        ${uploading
                            ? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] text-[var(--color-primary-600)] cursor-wait'
                            : 'border-[var(--color-surface-300)] bg-[var(--color-surface-50)] text-[var(--color-text-muted)] hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] hover:text-[var(--color-primary-600)]'
                        }`}
                    >
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5 opacity-60" />}
                        <span className="mt-1">{uploading ? 'UPLOADING…' : 'UPLOAD .DOCX'}</span>
                        <input type="file" className="hidden" accept=".docx" onChange={handleFileUpload} ref={fileInputRef} disabled={uploading} />
                    </label>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2 space-y-2 min-h-0 scroll-smooth">
                    {docs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-muted)]">
                            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-50)] flex items-center justify-center mb-4 opacity-50">
                                <FileText className="w-8 h-8" />
                            </div>
                            <p className="text-xs font-semibold uppercase tracking-wider">Empty Library</p>
                        </div>
                    ) : docs.map(doc => {
                        const isActive = selectedFile === doc.filename;
                        const isCorrupted = doc.corrupted;
                        return (
                            <div
                                key={doc.filename}
                                onClick={() => handleSelectFile(doc.filename, isCorrupted)}
                                className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left relative overflow-hidden border
                                    ${isCorrupted
                                        ? 'opacity-60 cursor-not-allowed bg-red-50/30 border-red-100'
                                        : isActive
                                            ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-200)] shadow-md ring-1 ring-[var(--color-primary-100)]'
                                            : 'hover:bg-[var(--color-surface-50)] cursor-pointer border-transparent hover:border-[var(--color-surface-200)] shadow-sm'
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-inner transition-colors ${isCorrupted ? 'bg-red-50' : isActive ? 'bg-white' : 'bg-[var(--color-surface-100)]'
                                    }`}>
                                    {isCorrupted
                                        ? <AlertTriangle className="w-5 h-5 text-red-500" />
                                        : <FileText className={`w-5 h-5 ${isActive ? 'text-[var(--color-primary-600)]' : 'text-[var(--color-text-muted)]'}`} />
                                    }
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[13px] font-bold truncate tracking-tight mb-0.5 ${isCorrupted ? 'text-red-700 line-through opacity-70' : isActive ? 'text-[var(--color-primary-800)]' : 'text-[var(--color-text-main)]'
                                        }`}>{doc.filename}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)]' : 'bg-[var(--color-surface-200)] text-[var(--color-text-muted)]'
                                            }`}>
                                            {formatBytes(doc.size_bytes)}
                                        </span>
                                        <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                                            {timeAgo(doc.modified)}
                                        </span>
                                    </div>
                                </div>

                                {/* Delete */}
                                <button
                                    onClick={(e) => handleDeleteDocument(e, doc.filename)}
                                    disabled={deleting === doc.filename}
                                    className="shrink-0 p-2 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                                    title="Delete"
                                >
                                    {deleting === doc.filename
                                        ? <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                        : <Trash2 className="w-4 h-4" />}
                                </button>

                                {/* Corrupted Label */}
                                {isCorrupted && (
                                    <div className="absolute top-0 right-0 py-0.5 px-2 bg-red-500 text-[8px] font-black text-white uppercase tracking-tighter rounded-bl-lg">
                                        Corrupted
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
