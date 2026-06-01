// AdvanceWorkspace — DocBot agent workspace (Track A5 decomposition).
// This component owns ALL state + handlers (the orchestrator); the three panels
// (chat / preview / library) are presentational components under ./advance-workshop/.
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ENDPOINTS } from '../config/api';
import { useDocuments } from '../hooks/queries/useDocuments';
import { DocBotChat } from './advance-workshop/DocBotChat';
import { DocumentPreview } from './advance-workshop/DocumentPreview';
import { DocumentLibrary } from './advance-workshop/DocumentLibrary';

const API_BASE = ENDPOINTS.fileEditor;

export function AdvanceWorkspace() {
    /* ── State ── */
    const [sessionId] = useState(() =>
        localStorage.getItem('agentSessionId') || `ui-${Math.random().toString(36).substr(2, 9)}`
    );
    const { data: docs = [], refetch: refetchDocuments } = useDocuments();
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

    /* ── Persist chat + session to localStorage ── */
    useEffect(() => {
        localStorage.setItem('agentChatHistory', JSON.stringify(chatHistory));
        localStorage.setItem('agentSessionId', sessionId);
    }, [chatHistory, sessionId]);

    /* ── Docs come from React Query (useDocuments); refetchDocuments() after
          upload/delete/chat-edit. ── */

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
                await refetchDocuments();
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
            await refetchDocuments();
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

            await refetchDocuments();
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
            <DocBotChat
                chatHistory={chatHistory}
                isSending={isSending}
                chatInput={chatInput}
                setChatInput={setChatInput}
                selectedFile={selectedFile}
                chatScrollRef={chatScrollRef}
                onClearChat={handleClearChat}
                onSendMessage={handleSendMessage}
            />
            <DocumentPreview
                selectedFile={selectedFile}
                previewHtml={previewHtml}
                previewLoading={previewLoading}
                previewError={previewError}
                onDownload={handleDownload}
                onRefresh={refreshPreview}
            />
            <DocumentLibrary
                docs={docs}
                selectedFile={selectedFile}
                uploading={uploading}
                deleting={deleting}
                fileInputRef={fileInputRef}
                onUpload={handleFileUpload}
                onSelectFile={handleSelectFile}
                onDeleteDocument={handleDeleteDocument}
            />
        </div>
    );
}

export default AdvanceWorkspace;
