import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FileText, File, UploadCloud, FileType2, Loader2, Save, Plus } from 'lucide-react';
import { Button, cn } from '../components/Button';
import { useToast } from '../components/Toasts';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import MDEditor from '@uiw/react-md-editor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/projects';

export function ProjectWorkspace() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeFileId, setActiveFileId] = useState(null);
    const [localContent, setLocalContent] = useState('');
    const { toast } = useToast();
    const fileInputRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    const fetchProject = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProject(res.data);
            if (res.data.files?.length > 0 && !activeFileId) {
                setActiveFileId(res.data.files[0]._id);
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load workspace', variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
        return () => clearTimeout(saveTimeoutRef.current);
    }, [id]);

    // When active file changes, load its content into the editor state
    useEffect(() => {
        if (project && activeFileId) {
            const file = project.files?.find(f => f._id === activeFileId);
            if (file) setLocalContent(file.content || '');
        }
    }, [activeFileId, project]);

    const handleSaveContent = async (contentToSave) => {
        if (!activeFileId) return;
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/${id}/files/${activeFileId}`, { content: contentToSave }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update the local project state quietly
            setProject(prev => {
                const updatedFiles = prev.files.map(f => f._id === activeFileId ? { ...f, content: contentToSave } : f);
                return { ...prev, files: updatedFiles };
            });
        } catch (error) {
            toast({ title: 'Save Failed', description: 'Could not sync changes to server.', variant: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleEditorChange = (value) => {
        setLocalContent(value || '');

        // Auto-save debounce (2 seconds)
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            handleSaveContent(value || '');
        }, 2000);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Strict mime type check
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['txt', 'md', 'doc', 'docx'].includes(ext)) {
            toast({ title: 'Invalid format', description: 'Please upload only .txt, .md, or Word docs', variant: 'error' });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/${id}/files`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setProject(prev => ({
                ...prev,
                files: [...prev.files, res.data]
            }));
            console.log("Server responded with new document:", res.data);
            setActiveFileId(res.data._id);
            toast({ title: 'File uploaded', description: 'Document parsed successfully', variant: 'success' });

        } catch (error) {
            toast({ title: 'Upload failed', description: error.response?.data?.error || 'Could not parse document', variant: 'error' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-500)]" /></div>;
    }

    if (!project) return <div>Workspace not found.</div>;

    const activeFile = project.files?.find(f => f._id === activeFileId);

    return (
        <div className="flex h-full w-full bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-surface-200)]">

            {/* Left Sidebar: File Tree */}
            <div className="w-64 border-r border-[var(--color-surface-200)] bg-[var(--color-surface-50)] flex flex-col">
                <div className="p-4 border-b border-[var(--color-surface-200)] pb-4 shadow-sm bg-white z-10">
                    <h2 className="font-bold text-[var(--color-text-main)] truncate" title={project.title}>
                        {project.title}
                    </h2>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-bold">
                        Workspace Files
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                    {project.files?.map((file) => (
                        <button
                            key={file._id}
                            onClick={() => setActiveFileId(file._id)}
                            className={cn(
                                "flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors w-full",
                                activeFileId === file._id
                                    ? "bg-[var(--color-primary-100)] text-[var(--color-primary-900)] font-bold"
                                    : "text-[var(--color-text-main)] hover:bg-[var(--color-surface-100)]"
                            )}
                        >
                            {file.originalName.endsWith('.md') ? <FileType2 className="w-4 h-4 shrink-0 text-blue-500" /> : <FileText className="w-4 h-4 shrink-0 opacity-70" />}
                            <span className="truncate">{file.originalName}</span>
                        </button>
                    ))}

                    <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2 text-xs border-dashed w-full shadow-none"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Plus className="w-3 h-3 mr-1" /> Add File</>}
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.doc,.docx" />
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">

                {/* Step 1: Empty State (No Files) */}
                {project.files?.length === 0 && (
                    <div className="absolute inset-0 z-10 bg-white flex flex-col items-center justify-center p-8">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-2xl border-2 border-dashed border-[var(--color-primary-200)] rounded-[var(--radius-xl)] p-16 text-center bg-[var(--color-primary-50)]/30 hover:bg-[var(--color-primary-50)]/60 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="w-20 h-20 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <UploadCloud className="w-10 h-10 text-[var(--color-primary-600)]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">Upload Initial Document</h3>
                            <p className="text-[var(--color-text-muted)] font-medium mb-6">
                                We support `.txt`, `.md`, `.doc`, and `.docx` unstructured manuscript files.
                            </p>
                            <Button disabled={uploading} className="shadow-lg bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-900)] text-white">
                                {uploading ? "Parsing Document..." : "Select File"}
                            </Button>
                        </motion.div>
                    </div>
                )}

                {/* Step 2: Editor State */}
                {activeFile && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--color-surface-200)] flex justify-between items-center bg-white z-10">
                            <h3 className="text-xl font-bold font-karla text-[var(--color-text-main)]">{activeFile.originalName}</h3>
                            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)]">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 text-green-600" /> Saved</>}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative" data-color-mode="light">
                            {activeFile.originalName.endsWith('.md') ? (
                                // Markdown Split Editor
                                <div className="h-full w-full custom-md-editor">
                                    <style>{`
                                        .w-md-editor { height: 100% !important; border-radius: 0; border: none; }
                                        .w-md-editor-toolbar { padding: 8px 16px; background: var(--color-surface-50); border-bottom: 1px solid var(--color-surface-200); }
                                    `}</style>
                                    <MDEditor
                                        value={localContent}
                                        onChange={handleEditorChange}
                                        preview="live"
                                        height="100%"
                                        className="h-full w-full border-0"
                                    />
                                </div>
                            ) : (
                                // Rich Text Editor (React-Quill)
                                <div className="h-full w-full flex flex-col p-4 overflow-y-auto bg-[var(--color-surface-50)]">
                                    <div className="bg-white max-w-4xl mx-auto w-full min-h-[800px] shadow-sm border border-[var(--color-surface-200)] pb-12">
                                        <style>{`
                                            .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid var(--color-surface-200); padding: 12px 24px; background: #fafafa; position: sticky; top: 0; z-index: 10; }
                                            .ql-container.ql-snow { border: none !important; font-family: 'DM Sans', sans-serif; font-size: 16px; }
                                            .ql-editor { padding: 48px 64px; min-height: 800px; color: var(--color-text-main); }
                                            .ql-editor p { margin-bottom: 1em; line-height: 1.6; }
                                            .ql-editor h1, .ql-editor h2, .ql-editor h3 { font-family: 'Karla', sans-serif; font-weight: bold; margin-bottom: 0.5em; margin-top: 1em; color: var(--color-primary-900); }
                                        `}</style>
                                        <ReactQuill
                                            theme="snow"
                                            value={localContent}
                                            onChange={handleEditorChange}
                                            className="h-full"
                                            modules={{
                                                toolbar: [
                                                    [{ 'header': [1, 2, 3, false] }],
                                                    ['bold', 'italic', 'underline', 'strike'],
                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                    ['clean']
                                                ]
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
