import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FileText, UploadCloud, FileType2, Loader2, Save, Plus, ChevronLeft, Trash2, Edit2, Check, X, Code2, Microscope, Settings, Play, FileDown, ListOrdered, ChevronDown, ChevronRight, ImagePlus } from 'lucide-react';
import { Button, cn } from '../components/Button';
import { useToast } from '../components/Toasts';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useProjectStore from '../store/useProjectStore';
import useAppStore from '../store/useAppStore';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import MDEditor from '@uiw/react-md-editor';
import MonacoEditor from '@monaco-editor/react';
import { ENDPOINTS } from '../config/api';

const API_URL = ENDPOINTS.projects;

export function ProjectWorkspace() {

    const latexPreviewRef = useRef(null);
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeFileId, setActiveFileId] = useState(
        // Pre-activate a file passed via navigation state (e.g. after reconstruct)
        location.state?.activeFileId || null
    );
    const [localContent, setLocalContent] = useState('');

    // UI states for renaming
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editingProjectTitle, setEditingProjectTitle] = useState('');
    const [editingFileId, setEditingFileId] = useState(null);
    const [editingFileName, setEditingFileName] = useState('');

    const { renameProject, deleteProject, recordVisit } = useProjectStore();
    const { toast, confirm } = useToast();
    const { latexContent, setLatexContent, targetStyle, setTargetStyle, customRules, setCustomRules, llmEngine, setLlmEngine, setDeepScanProjectId, setDeepScanSourceFileName } = useAppStore();
    const fileInputRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // LaTeX editor state
    const latexEditorRef = useRef(null);
    const latexFormRef = useRef(null);
    const [latexCompiling, setLatexCompiling] = useState(false);
    const [latexCompiled, setLatexCompiled] = useState(false);
    const [latexAssets, setLatexAssets] = useState([]);
    const [latexOutline, setLatexOutline] = useState([]);

    const fetchProject = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProject(res.data);
            recordVisit(res.data);
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

    const activeFile = project?.files?.find(f => f._id === activeFileId);

    // Ref to track which file ID is currently loaded in the editor to prevent active-typing loops
    const [loadedFileId, setLoadedFileId] = useState(null);

    // When active file changes, load its content into the editor state
    useEffect(() => {
        if (project && activeFileId) {
            if (activeFileId !== loadedFileId) {
                const file = project.files?.find(f => f._id === activeFileId);
                if (file) {
                    let text = file.content || '';

                    // If it's not Markdown and doesn't explicitly look like HTML, normalize to HTML paragraphs for Quill
                    const isMarkdownOrTex = file.originalName.toLowerCase().endsWith('.md') || file.originalName.toLowerCase().endsWith('.tex');
                    if (!isMarkdownOrTex && text && !text.includes('<p>') && !text.includes('<h')) {
                        text = text.split('\n')
                            .map(line => line.trim())
                            .filter(line => line.length > 0)
                            .map(line => `<p>${line}</p>`)
                            .join('');
                    }

                    setLocalContent(text);
                    setLoadedFileId(activeFileId);
                }
            }
        }
    }, [activeFileId, project, loadedFileId]);

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
        if (!['txt', 'md', 'doc', 'docx', 'tex'].includes(ext)) {
            toast({ title: 'Invalid format', description: 'Please upload only .txt, .md, .tex, or Word docs', variant: 'error' });
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

    // --- New CRUD Handlers ---

    const handleProjectRenameSubmit = async () => {
        if (!editingProjectTitle.trim() || editingProjectTitle === project.title) {
            setIsEditingProject(false);
            return;
        }
        const success = await renameProject(id, editingProjectTitle);
        if (success) {
            setProject(prev => ({ ...prev, title: editingProjectTitle }));
            toast({ title: 'Project Renamed', variant: 'success' });
        } else {
            toast({ title: 'Rename failed', variant: 'error' });
        }
        setIsEditingProject(false);
    };

    const handleProjectDelete = () => {
        confirm({
            title: "Delete Workspace",
            description: "Are you sure you want to permanently delete this entire project? This action cannot be undone.",
            confirmText: "Delete Project",
            onConfirm: async () => {
                const success = await deleteProject(id);
                if (success) {
                    toast({ title: 'Project Deleted', variant: 'success' });
                    navigate('/dashboard');
                } else {
                    toast({ title: 'Deletion failed', variant: 'error' });
                }
            }
        });
    };

    const handleFileRenameSubmit = async (fileId) => {
        if (!editingFileName.trim()) {
            setEditingFileId(null);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/${id}/files/${fileId}/rename`, { originalName: editingFileName }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProject(prev => {
                const updatedFiles = prev.files.map(f => f._id === fileId ? { ...f, originalName: res.data.originalName } : f);
                return { ...prev, files: updatedFiles };
            });
            toast({ title: 'File Renamed', variant: 'success' });
        } catch (error) {
            toast({ title: 'Rename failed', variant: 'error' });
        } finally {
            setEditingFileId(null);
        }
    };

    const handleFileDelete = (fileId, e) => {
        e.stopPropagation();

        confirm({
            title: "Delete File",
            description: "Are you sure you want to delete this file?",
            confirmText: "Delete",
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_URL}/${id}/files/${fileId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    setProject(prev => {
                        const updatedFiles = prev.files.filter(f => f._id !== fileId);
                        return { ...prev, files: updatedFiles };
                    });

                    if (activeFileId === fileId) {
                        const remainingFiles = project.files.filter(f => f._id !== fileId);
                        if (remainingFiles.length > 0) {
                            setActiveFileId(remainingFiles[0]._id);
                        } else {
                            setActiveFileId(null);
                            setLocalContent('');
                        }
                    }
                    toast({ title: 'File Deleted', variant: 'success' });
                } catch (error) {
                    toast({ title: 'Deletion failed', variant: 'error' });
                }
            }
        });
    };

    // ---- LaTeX Helpers ----
    useEffect(() => {
        if (!localContent || (!activeFile?.originalName.endsWith('.tex'))) { setLatexOutline([]); return; }
        const lines = localContent.split('\n');
        const newOutline = [];
        const sectionRegex = /^\\(sub)*section\*?\{([^}]+)\}/;
        lines.forEach((line, index) => {
            const match = line.trim().match(sectionRegex);
            if (match) {
                const level = match[1] ? match[1].length / 3 + 1 : 1;
                newOutline.push({ title: match[2], level, line: index + 1, id: `sec-${index}` });
            }
        });
        setLatexOutline(newOutline);
    }, [localContent, activeFile]);

    // const sanitizeLatex = useCallback((code) => {
    //     // ── Step 1: Structural sanitization ──
    //     const beginDocRegex = /\\begin\{document\}/;
    //     const firstBeginIndex = code.search(beginDocRegex);
    //     let preamble = ""; let restOfCode = code;
    //     if (firstBeginIndex !== -1) { preamble = code.substring(0, firstBeginIndex); restOfCode = code.substring(firstBeginIndex); }
    //     else { return `\\nonstopmode\n\\documentclass{article}\n\\begin{document}\n${code}\n\\end{document}`; }
    //     let hasDocClass = false;
    //     preamble = preamble.split('\n').filter(line => {
    //         if (line.trim().startsWith('\\documentclass')) { if (hasDocClass) return false; hasDocClass = true; return true; } return true;
    //     }).join('\n');
    //     if (!hasDocClass) preamble = '\\documentclass{article}\n' + preamble;
    //     let body = restOfCode.replace(/\\begin\{document\}/g, '').replace(/\\end\{document\}/g, '').replace(/\\documentclass(\[.*?\])?\{.*?\}/g, '');
    //     const packageRegex = /\\(usepackage|usetikzlibrary)(\[.*?\])?\{.*?\}/g;
    //     let packagesToHoist = "";
    //     let pkgMatch;
    //     while ((pkgMatch = packageRegex.exec(body)) !== null) { packagesToHoist += pkgMatch[0] + "\n"; }
    //     body = body.replace(packageRegex, '');

    //     // ── Step 2: Sanitize common error-causing patterns ──
    //     // Fix whitespace in includegraphics filenames
    //     body = body.replace(
    //         /\\includegraphics(\[.*?\])?\{([^}]*)\}/g,
    //         (match, opts, filename) => {
    //             const cleaned = filename.trim();
    //             return cleaned !== filename ? `\\includegraphics${opts || ''}{${cleaned}}` : match;
    //         }
    //     );
    //     // Fix unmatched braces
    //     let braceDepth = 0;
    //     for (const ch of body) { if (ch === '{') braceDepth++; else if (ch === '}') braceDepth--; }
    //     if (braceDepth > 0) body += '}'.repeat(braceDepth);
    //     // Balance \begin{env} and \end{env} pairs
    //     const envBeginRegex = /\\begin\{([^}]+)\}/g;
    //     const envEndRegex = /\\end\{([^}]+)\}/g;
    //     const envStack = {};
    //     let m;
    //     while ((m = envBeginRegex.exec(body)) !== null) { envStack[m[1]] = (envStack[m[1]] || 0) + 1; }
    //     while ((m = envEndRegex.exec(body)) !== null) { envStack[m[1]] = (envStack[m[1]] || 0) - 1; }
    //     let envFixSuffix = '', envFixPrefix = '';
    //     for (const [env, count] of Object.entries(envStack)) {
    //         if (count > 0) envFixSuffix += `\\end{${env}}\n`.repeat(count);
    //         else if (count < 0) envFixPrefix += `\\begin{${env}}\n`.repeat(Math.abs(count));
    //     }
    //     body = envFixPrefix + body + envFixSuffix;

    //     // 2d. Handle BibTeX — texlive.net doesn't run bibtex, so replace with thebibliography
    //     const hasBib = /\\bibliography\{/.test(body) || /\\bibliography\{/.test(preamble);
    //     const hasBibStyle = /\\bibliographystyle\{/.test(body) || /\\bibliographystyle\{/.test(preamble);
    //     if (hasBib || hasBibStyle) {
    //         const citeRegex = /\\cite[tp]?\{([^}]+)\}/g;
    //         const citeKeys = new Set();
    //         let citeMatch;
    //         while ((citeMatch = citeRegex.exec(body)) !== null) {
    //             citeMatch[1].split(',').forEach(k => citeKeys.add(k.trim()));
    //         }
    //         body = body.replace(/\\bibliographystyle\{[^}]*\}/g, '');
    //         body = body.replace(/\\bibliography\{[^}]*\}/g, '');
    //         preamble = preamble.replace(/\\bibliographystyle\{[^}]*\}/g, '');
    //         preamble = preamble.replace(/\\bibliography\{[^}]*\}/g, '');
    //         if (citeKeys.size > 0) {
    //             let bibBlock = `\n\\begin{thebibliography}{${citeKeys.size}}\n`;
    //             let idx = 1;
    //             for (const key of citeKeys) {
    //                 bibBlock += `\\bibitem{${key}} [${idx}] Reference: \\textit{${key.replace(/_/g, '\\_')}}.\n`;
    //                 idx++;
    //             }
    //             bibBlock += `\\end{thebibliography}\n`;
    //             body += bibBlock;
    //         }
    //     }

    //     // ── Step 3: Force nonstopmode ──
    //     return `\\nonstopmode\n${preamble}\n${packagesToHoist}\n\\begin{document}\n${body}\n\\end{document}`;
    // }, []);
const sanitizeLatex = useCallback((code) => {
    if (!code || !code.trim()) {
        return `\\documentclass{article}
\\begin{document}
Empty document
\\end{document}`;
    }

    const trimmed = code.trim();

    // If it already looks like a full LaTeX document, do not wrap it
    if (trimmed.includes("\\documentclass") && trimmed.includes("\\begin{document}")) {
        return trimmed;
    }

    // If it has begin{document} but no documentclass, add only documentclass
    if (trimmed.includes("\\begin{document}") && !trimmed.includes("\\documentclass")) {
        return `\\documentclass{article}
${trimmed}`;
    }

    // Otherwise treat it like raw content
    return `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{hyperref}
\\begin{document}
${trimmed}
\\end{document}`;
}, []);

    const handleLatexCompile = useCallback(() => {
        if (!latexFormRef.current) return;
        setLatexCompiling(true);
        const form = latexFormRef.current;
        form.querySelectorAll('.dynamic-asset').forEach(el => el.remove());
        const hiddenInput = form.querySelector('input[name="filecontents[]"]');
        if (hiddenInput) hiddenInput.value = sanitizeLatex(localContent);
        latexAssets.forEach((file) => {
            const nameInput = document.createElement('input'); nameInput.type = 'hidden'; nameInput.name = 'filename[]'; nameInput.value = file.name; nameInput.className = 'dynamic-asset'; form.appendChild(nameInput);
            const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.name = 'filecontents[]'; fileInput.className = 'dynamic-asset';
            const dataTransfer = new DataTransfer(); dataTransfer.items.add(file); fileInput.files = dataTransfer.files; form.appendChild(fileInput);
        });
        form.submit();
        setTimeout(() => { setLatexCompiling(false); setLatexCompiled(true); }, 1500);
    }, [localContent, latexAssets, sanitizeLatex]);

    const handleLatexAssetUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setLatexAssets(prev => { const existing = new Set(prev.map(f => f.name)); return [...prev, ...newFiles.filter(f => !existing.has(f.name))]; });
        }
        e.target.value = '';
    };

    // Format this document via the Deep Scan engine (the single document→LaTeX flow).
    const handleFormatInDeepScan = () => {
        setDeepScanProjectId(id);
        setDeepScanSourceFileName(activeFile?.originalName?.replace(/\.[^.]+$/, '') || '');
        navigate('/deep-scan');
    };

    // ---------------------------------


const compileLatex = useCallback(async () => {
    setLatexCompiling(true);
    setLatexCompiled(false);

    try {
        const response = await fetch(ENDPOINTS.latexCompile, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                latex: sanitizeLatex(localContent),
            }),
        });

        const iframe = document.querySelector('iframe[name="latex-pdf-preview-ws"]');

        if (!response.ok) {
            let errorMessage = "Compilation failed";
            try {
                const data = await response.json();
                errorMessage = data?.error || data?.message || errorMessage;
            } catch {
                errorMessage = await response.text();
            }

            if (iframe) {
                iframe.srcdoc = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background: #fff7f7; color: #7f1d1d; height: 100%; box-sizing: border-box;">
                        <h2 style="margin-top:0;">Compilation Error</h2>
                        <pre style="white-space: pre-wrap; word-break: break-word; font-size: 12px; line-height: 1.5;">${String(errorMessage)
                            .replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")}</pre>
                    </div>
                `;
            }

            throw new Error(errorMessage);
        }

        const blob = await response.blob();
        const pdfUrl = URL.createObjectURL(blob);

        if (iframe) {
            iframe.src = pdfUrl;
        }

        setLatexCompiled(true);

        toast({
            title: "Compilation successful",
            description: "PDF preview updated.",
            variant: "success",
        });
    } catch (err) {
        console.error("LaTeX Compilation Error:", err);

        toast({
            title: "Compilation failed",
            description: String(err.message || "Could not compile LaTeX").slice(0, 200),
            variant: "error",
        });
    } finally {
        setLatexCompiling(false);
    }
}, [localContent, sanitizeLatex, toast]);




    // -----------------------------------------
    if (loading) {
        return <div className="flex h-full items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-500)]" /></div>;
    }

    if (!project) return <div>Workspace not found.</div>;

    return (
        <div className="flex h-full w-full bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-surface-200)]">

            {/* Left Sidebar: File Tree */}
            <div className="w-64 border-r border-[var(--color-surface-200)] bg-[var(--color-surface-50)] flex flex-col">
                <div className="p-4 border-b border-[var(--color-surface-200)] pb-4 shadow-sm bg-white z-10 flex flex-col gap-3">
                    <Link to="/dashboard" className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary-600)] transition-colors w-max">
                        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>

                    <div className="flex items-start justify-between group">
                        {isEditingProject ? (
                            <div className="flex items-center gap-1 w-full bg-[var(--color-surface-100)] p-1 rounded border border-[var(--color-primary-300)]">
                                <input
                                    autoFocus
                                    className="w-full bg-transparent text-sm font-bold text-[var(--color-text-main)] outline-none px-1"
                                    value={editingProjectTitle}
                                    onChange={(e) => setEditingProjectTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleProjectRenameSubmit()}
                                />
                                <button onClick={handleProjectRenameSubmit} className="p-1 hover:bg-green-100 text-green-700 rounded"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setIsEditingProject(false)} className="p-1 hover:bg-red-100 text-red-700 rounded"><X className="w-3 h-3" /></button>
                            </div>
                        ) : (
                            <>
                                <h2
                                    className="font-bold text-[var(--color-text-main)] truncate cursor-pointer hover:text-[var(--color-primary-600)]"
                                    title="Click to rename"
                                    onClick={() => {
                                        setEditingProjectTitle(project.title);
                                        setIsEditingProject(true);
                                    }}
                                >
                                    {project.title}
                                </h2>
                                <button
                                    onClick={handleProjectDelete}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all shrink-0 ml-2"
                                    title="Delete Project"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                    {project.files?.map((file) => (
                        <div
                            key={file._id}
                            className={cn(
                                "group flex items-center justify-between p-2 rounded-lg text-sm transition-colors w-full cursor-pointer",
                                activeFileId === file._id
                                    ? "bg-[var(--color-primary-100)] text-[var(--color-primary-900)] font-bold"
                                    : "text-[var(--color-text-main)] hover:bg-[var(--color-surface-100)]"
                            )}
                            onClick={() => {
                                if (editingFileId !== file._id) setActiveFileId(file._id);
                            }}
                        >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                {file.originalName.endsWith('.md') ? <FileType2 className="w-4 h-4 shrink-0 text-blue-500" /> : file.originalName.endsWith('.tex') ? <Code2 className="w-4 h-4 shrink-0 text-[var(--color-primary-500)]" /> : <FileText className="w-4 h-4 shrink-0 opacity-70" />}

                                {editingFileId === file._id ? (
                                    <input
                                        autoFocus
                                        className="w-full bg-white text-xs font-normal text-black outline-none px-1 rounded border border-blue-300"
                                        value={editingFileName}
                                        onChange={(e) => setEditingFileName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleFileRenameSubmit(file._id);
                                            if (e.key === 'Escape') setEditingFileId(null);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        onBlur={() => handleFileRenameSubmit(file._id)}
                                    />
                                ) : (
                                    <span className="truncate flex-1" title={file.originalName}>{file.originalName}</span>
                                )}
                            </div>

                            {/* Hover Actions */}
                            {editingFileId !== file._id && (
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1 bg-white/50 backdrop-blur-sm rounded-sm">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingFileName(file.originalName); setEditingFileId(file._id); }}
                                        className="p-1 hover:text-blue-600 rounded"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={(e) => handleFileDelete(file._id, e)}
                                        className="p-1 hover:text-red-600 rounded"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    <Button
                        variant="secondary"
                        size="sm"
                        className="mt-2 text-xs border-dashed w-full shadow-none"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Plus className="w-3 h-3 mr-1" />Add File</>}
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.doc,.docx,.tex" />
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">

                {/* Step 2: Editor State */}
                {activeFile && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-[var(--color-surface-200)] flex justify-between items-center bg-white z-10">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold font-karla text-[var(--color-text-main)]">{activeFile.originalName}</h3>
                                {activeFile.originalName.endsWith('.tex') && (
                                    <Button
                                        variant="primary"
                                        // onClick={handleLatexCompile}
                                        onClick={compileLatex}
                                        disabled={latexCompiling}
                                        className="h-8 px-4 text-xs font-semibold"
                                    >
                                        {latexCompiling ? (
                                            <><span className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />Compiling...</>
                                        ) : (
                                            <><Play className="h-3.5 w-3.5 mr-1.5 fill-current" />Compile PDF</>
                                        )}
                                    </Button>
                                )}
                                <button
                                    onClick={handleFormatInDeepScan}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-900)] rounded-lg shadow-sm transition-colors"
                                    title="Format this document with the Deep Scan engine"
                                >
                                    <Microscope className="w-3.5 h-3.5" />
                                    Format (Deep Scan)
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)]">
                                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 text-green-600" /> Saved</>}
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative" data-color-mode="light">
                            {loadedFileId !== activeFile._id ? (
                                <div className="h-full w-full flex items-center justify-center p-8 bg-[var(--color-surface-50)]">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-500)]" />
                                        <p className="text-sm font-medium text-[var(--color-text-muted)] animate-pulse">Hydrating editor...</p>
                                    </div>
                                </div>
                            ) : activeFile.originalName.endsWith('.tex') ? (
                                <div className="flex flex-col h-full">

                                    {/* LaTeX Split Workspace */}
                                    <div className="flex flex-1 min-h-0">
                                        {/* Outline Sidebar */}
                                        <div className="hidden md:flex flex-col w-52 bg-[#1e1e1e] border-r border-[#333] shrink-0 text-[#ccc] overflow-hidden">
                                            <div className="flex items-center px-3 py-2 border-b border-[#333] shrink-0">
                                                <ListOrdered className="h-3.5 w-3.5 mr-2" />
                                                <span className="text-[10px] font-semibold uppercase tracking-wider">Outline</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto py-1">
                                                {latexOutline.length === 0 ? (
                                                    <div className="px-3 py-3 text-[10px] text-[#888] italic text-center">No sections. Use \section{'{...}'} to build an outline.</div>
                                                ) : latexOutline.map((item) => {
                                                    const pl = item.level === 1 ? 'pl-3' : item.level === 2 ? 'pl-6' : 'pl-9';
                                                    const sz = item.level === 1 ? 'text-[12px] font-medium text-white' : 'text-[11px] text-[#ccc]';
                                                    return (
                                                        <div key={item.id} className={`flex items-center py-1 cursor-pointer hover:bg-[#2a2d2e] ${pl}`}
                                                            onClick={() => { if (latexEditorRef.current) { latexEditorRef.current.revealLineInCenter(item.line); latexEditorRef.current.setPosition({ lineNumber: item.line, column: 1 }); latexEditorRef.current.focus(); } }}
                                                        >
                                                            <span className={`${sz} truncate pr-2`} title={item.title}>{item.title}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Monaco Editor */}
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)] shrink-0 text-xs">
                                                <span className="font-semibold text-[var(--color-text-main)]">{activeFile.originalName}</span>
                                                <div>
                                                    <input type="file" accept="image/*, .sty, .bib, .cls" multiple onChange={handleLatexAssetUpload} className="hidden" id="latex-asset-upload-ws" />
                                                    <label htmlFor="latex-asset-upload-ws" className="cursor-pointer flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[var(--color-primary-600)] bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)] rounded transition-colors">
                                                        <ImagePlus className="h-3.5 w-3.5" /> Upload Assets
                                                    </label>
                                                </div>
                                            </div>
                                            {latexAssets.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 px-3 py-1.5 bg-[var(--color-surface-100)] border-b border-[var(--color-surface-200)] shrink-0">
                                                    {latexAssets.map((file, idx) => (
                                                        <div key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-[var(--color-surface-300)] rounded-md text-[11px]">
                                                            <span className="max-w-[100px] truncate">{file.name}</span>
                                                            <button onClick={() => setLatexAssets(prev => prev.filter((_, i) => i !== idx))} className="hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <MonacoEditor
                                                    height="100%"
                                                    defaultLanguage="latex"
                                                    value={localContent}
                                                    onChange={handleEditorChange}
                                                    theme="vs-light"
                                                    onMount={(editor) => { latexEditorRef.current = editor; }}
                                                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', lineNumbers: 'on', padding: { top: 12 }, scrollBeyondLastLine: false, smoothScrolling: true }}
                                                />
                                            </div>
                                        </div>

                                        {/* PDF Preview */}
                                        <div className="flex flex-col flex-1 overflow-hidden border-l border-[var(--color-surface-300)]">
                                            <div className="flex items-center px-3 py-1.5 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)] shrink-0 text-xs">
                                                <FileDown className="h-3.5 w-3.5 mr-2 text-[var(--color-text-muted)]" />
                                                <span className="font-semibold text-[var(--color-text-main)]">PDF Preview</span>
                                            </div>
                                            <div className="flex-1 bg-[#525659] relative">
                                                <iframe ref={latexPreviewRef} name="latex-pdf-preview-ws" className={`w-full h-full border-none transition-opacity duration-300 ${latexCompiling ? 'opacity-50' : 'opacity-100'}`} title="Compiled PDF" />
                                                {!latexCompiled && !latexCompiling && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                                                        <FileDown className="h-12 w-12 mb-3 opacity-50" />
                                                        <p className="text-base font-medium">No PDF Generated</p>
                                                        <p className="text-xs mt-1">Write LaTeX and click Compile PDF</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hidden compile form */}
                                    <form action="https://texlive.net/cgi-bin/latexcgi" method="POST" encType="multipart/form-data" target="latex-pdf-preview-ws" className="hidden" ref={latexFormRef}>
                                        <input type="hidden" name="filecontents[]" value={localContent} />
                                        <input type="hidden" name="filename[]" value={activeFile.originalName} />
                                        <input type="hidden" name="engine" value="pdflatex" />
                                        <input type="hidden" name="return" value="pdf" />
                                    </form>
                                </div>
                            ) : activeFile.originalName.endsWith('.md') ? (
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
                                We support `.txt`, `.md`, `.doc`, `.docx`, and `.tex` unstructured manuscript files.
                            </p>
                            <Button disabled={uploading} className="shadow-lg bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-900)] text-white">
                                {uploading ? "Parsing Document..." : "Select File"}
                            </Button>
                        </motion.div>
                    </div>
                )}
            </div>

        </div>
    );
}
