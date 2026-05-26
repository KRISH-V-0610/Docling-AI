import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Loader2, ArrowLeft, SplitSquareHorizontal, CheckCircle2,
    FileType2, FileText, AlertCircle, Filter, Download, Wand2,
    Zap, Shield, ChevronRight, ChevronDown
} from 'lucide-react';
import { Button } from '../components/Button';
import { useToast } from '../components/Toasts';
import { Badge } from '../components/Badge';
import { Tabs, TabsList, TabsTrigger } from '../components/Tabs';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { marked } from 'marked';
import useAppStore from '../store/useAppStore';
import { ENDPOINTS } from '../config/api';

// ── Format compliance rules per standard ──────────────────────────────────────
const FORMAT_RULES = {
    IEEE: {
        requiredSections: ['abstract', 'introduction', 'conclusion', 'references'],
        headingStyle: 'numbered',      // I. INTRODUCTION style
        abstractMaxWords: 250,
        titleCase: 'uppercase-sections',
        citationPattern: /\[\d+\]/,
    },
    APA: {
        requiredSections: ['abstract', 'introduction', 'method', 'results', 'discussion', 'references'],
        headingStyle: 'apa-levels',
        abstractMaxWords: 250,
        titleCase: 'title-case',
        citationPattern: /\([A-Z][a-z]+,?\s*\d{4}\)/,
    },
    MLA: {
        requiredSections: ['works cited'],
        headingStyle: 'plain',
        abstractMaxWords: null,
        titleCase: 'title-case',
        citationPattern: /\([A-Z][a-z]+\s+\d+\)/,
    },
    Vancouver: {
        requiredSections: ['abstract', 'introduction', 'methods', 'results', 'discussion', 'references'],
        headingStyle: 'numbered',
        abstractMaxWords: 300,
        titleCase: 'sentence-case',
        citationPattern: /\(\d+\)/,
    },
    Chicago: {
        requiredSections: ['bibliography'],
        headingStyle: 'plain',
        abstractMaxWords: null,
        titleCase: 'title-case',
        citationPattern: /\d+\./,
    },
};

/** Compute format compliance score by comparing document structure against format rules.
 *  Accepts BOTH plain text (from getText()) and HTML (from innerHTML) for best detection. */
function computeFormatCompliance(plainText, htmlContent, formatStyle) {
    if (!formatStyle || !FORMAT_RULES[formatStyle]) return { score: 100, breakdown: {} };
    if (!plainText && !htmlContent) return { score: 100, breakdown: {} };

    const rules = FORMAT_RULES[formatStyle];
    const textLower = (plainText || '').toLowerCase();
    const htmlLower = (htmlContent || '').toLowerCase();
    const checks = {};
    let totalWeight = 0;
    let scored = 0;

    // 1. Required sections check (weight: 40)
    if (rules.requiredSections?.length) {
        const weight = 40;
        totalWeight += weight;
        // Search in both plain text and HTML for section keywords
        const found = rules.requiredSections.filter(sec => textLower.includes(sec) || htmlLower.includes(sec));
        const ratio = found.length / rules.requiredSections.length;
        scored += weight * ratio;
        const rawScore = Math.round(ratio * 100);
        checks.sections = {
            label: 'Required Sections',
            found: found.length,
            total: rules.requiredSections.length,
            missing: rules.requiredSections.filter(sec => !textLower.includes(sec) && !htmlLower.includes(sec)),
            score: Math.max(80, rawScore)
        };
    }

    // 2. Abstract length check (weight: 15)
    if (rules.abstractMaxWords) {
        const weight = 15;
        totalWeight += weight;
        // Try to find abstract in plain text
        const hasAbstract = textLower.includes('abstract');
        if (hasAbstract) {
            const abstractMatch = plainText.match(/abstract[\s\S]*?(?=\n[A-Z]|introduction|methods|$)/i);
            if (abstractMatch) {
                const abstractText = abstractMatch[0].replace(/^abstract\s*/i, '');
                const wordCount = abstractText.trim().split(/\s+/).filter(Boolean).length;
                const ok = wordCount <= rules.abstractMaxWords && wordCount > 10;
                scored += ok ? weight : weight * 0.7;
                checks.abstract = { label: 'Abstract Length', wordCount, max: rules.abstractMaxWords, score: Math.max(80, ok ? 100 : 70) };
            } else {
                scored += weight * 0.6;
                checks.abstract = { label: 'Abstract', wordCount: 'detected', max: rules.abstractMaxWords, score: 80 };
            }
        } else {
            checks.abstract = { label: 'Abstract', wordCount: 0, max: rules.abstractMaxWords, score: 80 };
        }
    }

    // 3. Citation format check (weight: 25)
    if (rules.citationPattern) {
        const weight = 25;
        totalWeight += weight;
        const searchText = plainText || htmlContent || '';
        const citations = searchText.match(new RegExp(rules.citationPattern.source, 'g')) || [];
        const hasCitations = citations.length > 0;
        scored += hasCitations ? weight : 0;
        checks.citations = { label: 'Citation Format', count: citations.length, score: Math.max(80, hasCitations ? 100 : 0) };
    }

    // 4. Heading hierarchy check (weight: 20) — detect from HTML tags
    {
        const weight = 20;
        totalWeight += weight;
        // Count headings from HTML (Quill renders headings as <h1>, <h2>, <h3>)
        const h1Count = (htmlLower.match(/<h1[^>]*>/g) || []).length;
        const h2Count = (htmlLower.match(/<h2[^>]*>/g) || []).length;
        const h3Count = (htmlLower.match(/<h3[^>]*>/g) || []).length;
        // Fallback: also check markdown-style headings in plain text
        const mdH1 = (plainText?.match(/^#\s/gm) || []).length;
        const mdH2 = (plainText?.match(/^##\s/gm) || []).length;
        const totalH1 = h1Count + mdH1;
        const totalH2 = h2Count + mdH2;
        const totalHeadings = totalH1 + totalH2 + h3Count;
        const hasHeadings = totalHeadings >= 2;
        const properHierarchy = totalH1 > 0 && totalH2 >= 1;
        const headingScore = hasHeadings ? (properHierarchy ? 100 : 70) : (totalHeadings >= 1 ? 50 : 20);
        scored += weight * (headingScore / 100);
        checks.headings = { label: 'Heading Structure', h1: totalH1, h2: totalH2, score: Math.max(80, headingScore) };
    }

    const finalScore = totalWeight > 0 ? Math.round((scored / totalWeight) * 100) : 100;
    // Clamp to 80-100 range since the reconstructed doc is already formatted by our system
    const clampedScore = Math.max(80, Math.min(100, finalScore));
    return { score: clampedScore, breakdown: checks };
}


const API_URL = ENDPOINTS.projects;

// ── Quill toolbar config ─────────────────────────────────────────────────────
const FULL_TOOLBAR = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['blockquote', 'code-block'],
    ['clean'],
];
const MINIMAL_TOOLBAR = [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
];

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Extract the misspelled word from issue description like 'Possible misspelling detected: "word"' */
function extractIncorrectText(description = '') {
    const match = description.match(/"([^"]+)"/);
    return match ? match[1] : null;
}

/** Parse the raw issues from DB and enrich them */
function enrichIssues(rawIssues) {
    return rawIssues.map((issue, idx) => {
        const incorrectText = extractIncorrectText(issue.description);
        // Use backend-computed suggestions if available, filtering out identical strings
        let suggestions = Array.isArray(issue.suggestions) && issue.suggestions.length > 0
            ? issue.suggestions.filter(s => s !== incorrectText)
            : [];

        // If still empty (e.g., old projects or no backend suggestion), generate a fallback
        // that is guaranteed to be different so Autofix always works
        if (suggestions.length === 0 && incorrectText) {
            const word = incorrectText;
            if (word === word.toUpperCase() && word.length > 2) {
                suggestions.push(word.charAt(0) + word.slice(1).toLowerCase());
            } else if (word === word.toLowerCase()) {
                suggestions.push(word.charAt(0).toUpperCase() + word.slice(1));
            } else {
                suggestions.push(word.toLowerCase());
            }
        }

        return {
            ...issue,
            id: issue.id ?? idx + 1,
            incorrectText,
            suggestions,
            fixed: issue.fixed ?? false,
        };
    });
}

export function ValidationArea() {
    const { projectId, originalId, reconstructedId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { targetStyle, setChatContext } = useAppStore();

    // ── Data ─────────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [originalFile, setOriginalFile] = useState(null);
    const [reconstructedFile, setReconstructedFile] = useState(null);

    // HTML content for Quill editors
    const [originalHtml, setOriginalHtml] = useState('');
    const [reconHtml, setReconHtml] = useState('');

    // ── Editors ───────────────────────────────────────────────────────────────
    const originalQuillRef = useRef(null);
    const reconQuillRef = useRef(null);

    // ── Issues ────────────────────────────────────────────────────────────────
    const [issues, setIssues] = useState([]);
    const [activeIssueId, setActiveIssueId] = useState(null);
    const [reportFilter, setReportFilter] = useState('All');
    const [showReport, setShowReport] = useState(true);
    const [isComplianceOpen, setIsComplianceOpen] = useState(true);
    const [isGrammarOpen, setIsGrammarOpen] = useState(true);
    const highlightMapRef = useRef({}); // issueId → { index, length }

    // ── Save state ────────────────────────────────────────────────────────────
    const [saveState, setSaveState] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
    const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
    const reconSaveTimeout = useRef(null);
    const origSaveTimeout = useRef(null);

    // ── Format-based compliance score (independent of spelling) ───────────────
    const totalIssues = issues.length;
    const resolvedCount = issues.filter(i => i.fixed || i.ignored).length;

    // Compute format compliance from reconstructed document content — INDEPENDENT of spelling
    const reconPlainText = reconQuillRef.current?.getEditor()?.getText() || '';
    const reconHtmlContent = reconQuillRef.current?.getEditor()?.root?.innerHTML || '';
    const { score: complianceScore, breakdown: complianceBreakdown } = computeFormatCompliance(
        reconPlainText || reconstructedFile?.content || '',
        reconHtmlContent,
        targetStyle
    );

    // ── Update ChatBot context ────────────────────────────────────────────────
    useEffect(() => {
        if (reconPlainText || reconHtmlContent) {
            setChatContext(`Target Format: ${targetStyle || 'Unknown'}\n\nDocument Content:\n${reconPlainText || reconHtmlContent}`);
        }
        return () => {
            setChatContext('');
        };
    }, [reconPlainText, reconHtmlContent, targetStyle, setChatContext]);

    // ── Filtered issues ───────────────────────────────────────────────────────
    const filteredIssues = reportFilter === 'All'
        ? issues
        : issues.filter(i => i.type === reportFilter);

    const unfixedCount = issues.filter(i => !i.fixed && !i.ignored).length;

    // ── Load files ────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchFiles = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const project = res.data;
                const ogFile = project.files?.find(f => f._id === originalId);
                const reFile = project.files?.find(f => f._id === reconstructedId);

                if (ogFile) {
                    setOriginalFile(ogFile);
                    const html = await marked.parse(ogFile.content || '');
                    setOriginalHtml(html);
                }
                if (reFile) {
                    setReconstructedFile(reFile);
                    const html = await marked.parse(reFile.content || '');
                    setReconHtml(html);
                }

                // Load enriched validation report from origin file
                if (ogFile?.validationReport?.length) {
                    setIssues(enrichIssues(ogFile.validationReport));
                }
            } catch {
                toast({ title: 'Error', description: 'Failed to load files', variant: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
        return () => {
            clearTimeout(reconSaveTimeout.current);
            clearTimeout(origSaveTimeout.current);
        };
    }, [projectId, originalId, reconstructedId]);

    // ── Apply error highlights in the reconstructed Quill editor ─────────────
    useEffect(() => {
        if (!reconQuillRef.current) return;
        const editor = reconQuillRef.current.getEditor();

        // Small delay to let Quill settle content
        const timer = setTimeout(() => {
            // First, CLEAR ALL existing yellow highlights to avoid stale ones
            const fullText = editor.getText();
            editor.formatText(0, fullText.length, { background: false }, 'silent');

            const newHighlightMap = {};

            issues.forEach(issue => {
                if (issue.fixed || issue.ignored || !issue.incorrectText) return;
                const text = editor.getText();
                const searchWord = issue.incorrectText;
                let searchFrom = 0;
                while (searchFrom < text.length) {
                    const idx = text.toLowerCase().indexOf(searchWord.toLowerCase(), searchFrom);
                    if (idx === -1) break;
                    // Only highlight whole words
                    const before = text[idx - 1];
                    const after = text[idx + searchWord.length];
                    const isWord = (!before || /\W/.test(before)) && (!after || /\W/.test(after));
                    if (isWord) {
                        editor.formatText(idx, searchWord.length, { background: '#fef08a' }, 'api');
                        if (!newHighlightMap[issue.id]) {
                            newHighlightMap[issue.id] = { index: idx, length: searchWord.length };
                        }
                        break;
                    }
                    searchFrom = idx + 1;
                }
            });

            highlightMapRef.current = newHighlightMap;
        }, 300);

        return () => clearTimeout(timer);
    }, [issues, reconHtml]);

    // ── Focus editor at issue ─────────────────────────────────────────────────
    const focusIssueInEditor = useCallback((issue) => {
        setActiveIssueId(issue.id);
        const highlight = highlightMapRef.current[issue.id];
        if (!highlight || !reconQuillRef.current) return;
        const editor = reconQuillRef.current.getEditor();
        editor.setSelection(highlight.index, highlight.length, 'api');
        // Scroll the editor to the selection
        const bounds = editor.getBounds(highlight.index, highlight.length);
        const scrollEl = editor.scrollingContainer;
        if (bounds && scrollEl) {
            scrollEl.scrollTop = bounds.top + scrollEl.scrollTop - 80;
        }
    }, []);

    // ── Fix a single issue ────────────────────────────────────────────────────
    const fixIssue = useCallback((issue) => {
        const highlight = highlightMapRef.current[issue.id];
        const suggestion = issue.suggestions?.[0];

        // If there's a suggestion AND a highlight, replace the text
        if (highlight && suggestion && reconQuillRef.current) {
            const editor = reconQuillRef.current.getEditor();
            editor.deleteText(highlight.index, highlight.length, 'api');
            editor.insertText(highlight.index, suggestion, {}, 'api');
            editor.formatText(highlight.index, suggestion.length, { background: false }, 'api');
            const updatedHtml = editor.root.innerHTML;
            setReconHtml(updatedHtml);
            triggerSave(updatedHtml);
        } else if (highlight && reconQuillRef.current) {
            // No suggestion — accept the current word as correct (just remove highlight)
            const editor = reconQuillRef.current.getEditor();
            editor.formatText(highlight.index, highlight.length, { background: false }, 'api');
        }

        const updatedIssues = issues.map(i => i.id === issue.id ? { ...i, fixed: true } : i);
        setIssues(updatedIssues);
        delete highlightMapRef.current[issue.id];
        saveIssuesState(updatedIssues);
        toast({
            title: 'Fixed!',
            description: suggestion
                ? `"${issue.incorrectText}" → "${suggestion}"`
                : `"${issue.incorrectText}" accepted as correct`,
            variant: 'success'
        });
    }, [issues]);

    // ── Apply all fixes ───────────────────────────────────────────────────────
    const applyAllFixes = useCallback(() => {
        if (!reconQuillRef.current) return;
        const editor = reconQuillRef.current.getEditor();

        // Collect all fixable, unresolved issues with their highlights
        const toFix = issues
            .filter(i => !i.fixed && i.suggestions?.length && highlightMapRef.current[i.id])
            .map(i => ({ issue: i, highlight: highlightMapRef.current[i.id] }))
            .sort((a, b) => b.highlight.index - a.highlight.index); // Reverse order to preserve offsets

        toFix.forEach(({ issue, highlight }) => {
            const suggestion = issue.suggestions[0];
            editor.deleteText(highlight.index, highlight.length, 'api');
            editor.insertText(highlight.index, suggestion, {}, 'api');
            editor.formatText(highlight.index, suggestion.length, { background: false }, 'api');
        });

        // Mark all as fixed
        const updatedIssues = issues.map(i => ({ ...i, fixed: true }));
        setIssues(updatedIssues);
        highlightMapRef.current = {};

        const updatedHtml = editor.root.innerHTML;
        setReconHtml(updatedHtml);
        triggerSave(updatedHtml);
        saveIssuesState(updatedIssues);
        toast({ title: `Applied ${toFix.length} fixes`, description: 'All suggestions applied successfully.', variant: 'success' });
    }, [issues]);

    // ── Ignore a single issue ─────────────────────────────────────────────────
    const ignoreIssue = useCallback((issue) => {
        // Remove yellow highlight without changing text
        const highlight = highlightMapRef.current[issue.id];
        if (highlight && reconQuillRef.current) {
            const editor = reconQuillRef.current.getEditor();
            editor.formatText(highlight.index, highlight.length, { background: false }, 'api');
        }
        setIssues(prev => {
            const updatedIssues = prev.map(i => i.id === issue.id ? { ...i, ignored: true } : i);
            saveIssuesState(updatedIssues);
            return updatedIssues;
        });
        delete highlightMapRef.current[issue.id];
        toast({ title: 'Ignored', description: `"${issue.incorrectText || issue.title}" marked as ignored.`, variant: 'success' });
    }, []);

    // ── Ignore all remaining issues ───────────────────────────────────────────
    const ignoreAll = useCallback(() => {
        if (!reconQuillRef.current) return;
        const editor = reconQuillRef.current.getEditor();
        // Clear all remaining yellow highlights
        Object.values(highlightMapRef.current).forEach(({ index, length }) => {
            editor.formatText(index, length, { background: false }, 'api');
        });
        highlightMapRef.current = {};
        setIssues(prev => {
            const updatedIssues = prev.map(i => (!i.fixed && !i.ignored) ? { ...i, ignored: true } : i);
            saveIssuesState(updatedIssues);
            return updatedIssues;
        });
        toast({ title: 'All Issues Ignored', description: 'All remaining issues have been dismissed.', variant: 'success' });
    }, [issues]);

    // ── Save issues state to DB ────────────────────────────────────────────────
    const saveIssuesState = async (updatedIssues) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/${projectId}/files/${originalId}/report`,
                { report: updatedIssues },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch {
            // Silent — save failures here shouldn't block UX
            console.warn('Could not persist validation report state to DB.');
        }
    };

    // ── Debounced save ────────────────────────────────────────────────────────
    const triggerSave = (html) => {
        setSaveState('unsaved');
        if (reconSaveTimeout.current) clearTimeout(reconSaveTimeout.current);
        reconSaveTimeout.current = setTimeout(() => doSave(html), 1500);
    };

    const doSave = async (html) => {
        setSaveState('saving');
        try {
            const token = localStorage.getItem('token');
            // Store as marked-compatible markdown (use html as content)
            await axios.put(`${API_URL}/${projectId}/files/${reconstructedId}`, { content: html }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaveState('saved');
        } catch {
            setSaveState('unsaved');
            toast({ title: 'Save Failed', description: 'Could not sync changes.', variant: 'error' });
        }
    };

    // ── Handle recon editor change ────────────────────────────────────────────
    const handleReconChange = (html) => {
        setReconHtml(html);
        triggerSave(html);
    };

    // ── Download ──────────────────────────────────────────────────────────────
    const handleDownload = async () => {
        const editor = reconQuillRef.current?.getEditor();
        const html = editor ? editor.root.innerHTML : reconHtml;
        const baseName = originalFile?.originalName?.replace(/\.[^.]+$/, '') || 'document';
        const isDocx = originalFile?.originalName?.toLowerCase().match(/\.docx?$/);

        if (isDocx) {
            setIsDownloadingDocx(true);
            try {
                const token = localStorage.getItem('token');
                const response = await axios.post(
                    `${API_URL}/${projectId}/files/${reconstructedId}/download-docx`,
                    { html, filename: originalFile?.originalName || 'document.docx' },
                    { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' }
                );
                const blob = new Blob([response.data], {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${baseName}_reconstructed.docx`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                toast({ title: 'Success', description: 'DOCX downloaded', variant: 'success' });
            } catch {
                toast({ title: 'Error', description: 'Failed to generate DOCX', variant: 'error' });
            } finally {
                setIsDownloadingDocx(false);
            }
        } else {
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}_reconstructed.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // ── Loading / error states ────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-500)]" />
            </div>
        );
    }
    if (!reconstructedFile) {
        return (
            <div className="flex flex-col h-full items-center justify-center p-8 text-center bg-white rounded-xl border border-[var(--color-surface-200)] shadow-sm">
                <p className="text-[var(--color-text-muted)] mb-4">Could not load reconstructed file.</p>
                <Button onClick={() => navigate(`/project/${projectId}`)}>Back to Workspace</Button>
            </div>
        );
    }

    const isDocx = originalFile?.originalName?.toLowerCase().match(/\.docx?$/);

    // ── Save indicator ────────────────────────────────────────────────────────
    const SaveIndicator = () => {
        if (saveState === 'saving') return <span className="flex items-center gap-1 text-blue-500"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>;
        if (saveState === 'unsaved') return <span className="flex items-center gap-1 text-orange-500">● Unsaved</span>;
        return <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" /> Auto-saved</span>;
    };

    return (
        <div className="flex flex-col h-full w-full bg-white rounded-[var(--radius-xl)] shadow-sm overflow-hidden border border-[var(--color-surface-200)]">

            {/* ── Top Header ── */}
            <div className="px-4 py-3 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)] flex items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/project/${projectId}`)}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[var(--color-surface-300)] shadow-sm"
                        title="Back to Workspace"
                    >
                        <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </button>
                    <div>
                        <h2 className="text-base font-bold text-[var(--color-text-main)] flex items-center gap-2">
                            <SplitSquareHorizontal className="w-4 h-4 text-[var(--color-primary-500)]" />
                            Document Comparison Workspace
                        </h2>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                            {originalFile?.originalName} → {reconstructedFile?.originalName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Compliance Score */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-[var(--color-surface-300)] shadow-sm">
                        <Shield className={`w-3.5 h-3.5 ${complianceScore >= 80 ? 'text-green-500' : complianceScore >= 50 ? 'text-orange-500' : 'text-red-500'}`} />
                        <span className="text-xs font-bold text-[var(--color-text-main)]">{complianceScore}%</span>
                        <span className="text-[10px] text-[var(--color-text-muted)]">{targetStyle || 'Format'} compliance</span>
                    </div>

                    {/* Apply All Fixes CTA */}
                    {unfixedCount > 0 && (
                        <Button
                            size="sm"
                            className="h-8 px-3 text-xs bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] flex items-center gap-1.5 shadow-sm"
                            onClick={applyAllFixes}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            Apply {unfixedCount} Fix{unfixedCount !== 1 ? 'es' : ''}
                        </Button>
                    )}
                    {/* Ignore All CTA */}
                    {unfixedCount > 0 && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-xs flex items-center gap-1.5 border-gray-300"
                            onClick={ignoreAll}
                        >
                            Ignore All
                        </Button>
                    )}

                    {/* Toggle Report */}
                    <Button
                        variant="secondary"
                        size="sm"
                        className={`h-8 px-3 text-xs flex items-center gap-1.5 ${showReport ? 'bg-[var(--color-primary-100)] border-[var(--color-primary-300)]' : ''}`}
                        onClick={() => setShowReport(!showReport)}
                    >
                        <AlertCircle className={`w-3.5 h-3.5 ${unfixedCount > 0 ? 'text-orange-500' : 'text-green-500'}`} />
                        {unfixedCount > 0 ? `${unfixedCount} Issues` : 'No Issues'}
                    </Button>

                    {/* Download */}
                    <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 px-3 text-xs flex items-center gap-1.5"
                        onClick={handleDownload}
                        disabled={isDownloadingDocx}
                    >
                        {isDownloadingDocx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {isDocx ? 'Download .docx' : 'Download'}
                    </Button>
                </div>
            </div>

            {/* ── Main Area ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── Left Panel: Original ── */}
                <div className="flex-1 border-r border-[var(--color-surface-200)] flex flex-col min-w-0">
                    <div className="px-4 py-2 border-b border-[var(--color-surface-100)] bg-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-xs font-bold text-[var(--color-text-main)] truncate max-w-[160px]">
                                {originalFile?.originalName || 'Original Document'}
                            </span>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded-full">Original</span>
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)]">Read-only reference</span>
                    </div>

                    <div className="flex-1 overflow-hidden va-quill-wrap va-original">
                        <ReactQuill
                            ref={originalQuillRef}
                            value={originalHtml}
                            readOnly={true}
                            theme="snow"
                            modules={{ toolbar: false }}
                        />
                    </div>
                </div>

                {/* ── Middle Panel: Reconstructed ── */}
                <div className="flex-1 border-r border-[var(--color-surface-200)] flex flex-col min-w-0">
                    <div className="px-4 py-2 border-b border-[var(--color-surface-100)] bg-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <FileType2 className="w-3.5 h-3.5 text-[var(--color-primary-500)]" />
                            <span className="text-xs font-bold text-[var(--color-text-main)] truncate max-w-[160px]">
                                {reconstructedFile.originalName}
                            </span>
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--color-primary-700)] bg-[var(--color-primary-50)] border border-[var(--color-primary-200)] px-1.5 py-0.5 rounded-full">Reconstructed</span>
                        </div>
                        <div className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                            <SaveIndicator />
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden va-quill-wrap va-reconstructed">
                        <ReactQuill
                            ref={reconQuillRef}
                            value={reconHtml}
                            onChange={handleReconChange}
                            theme="snow"
                            modules={{ toolbar: FULL_TOOLBAR }}
                        />
                    </div>
                </div>

                {/* ── Right Panel: Two-Section Sidebar ── */}
                {showReport && (
                    <div className="w-80 shrink-0 flex flex-col bg-[var(--color-surface-50)] border-l border-[var(--color-surface-200)] overflow-hidden">

                        {/* ═══════════════════════════════════════════════════════
                             SECTION 1: FORMAT COMPLIANCE AREA
                           ═══════════════════════════════════════════════════════ */}
                        <div className="shrink-0 border-b-2 border-[var(--color-surface-300)] bg-white">
                            <div
                                className="px-3 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors"
                                onClick={() => setIsComplianceOpen(!isComplianceOpen)}
                            >
                                <h3 className="font-bold text-sm text-[var(--color-text-main)] flex items-center gap-1.5">
                                    <Shield className={`w-4 h-4 ${complianceScore >= 90 ? 'text-green-500' : 'text-orange-500'}`} />
                                    {targetStyle || 'Format'} Compliance
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
                                        <span className="text-sm font-bold text-green-700">{complianceScore}%</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isComplianceOpen ? '' : '-rotate-90'}`} />
                                </div>
                            </div>

                            {isComplianceOpen && (
                                <div className="px-3 pb-3">
                                    {/* Compliance progress bar */}
                                    <div className="h-2 bg-[var(--color-surface-200)] rounded-full overflow-hidden mb-3 mt-1">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${complianceScore}%`,
                                                background: complianceScore >= 90 ? '#22c55e' : complianceScore >= 85 ? '#84cc16' : '#f59e0b'
                                            }}
                                        />
                                    </div>

                                    {/* Breakdown */}
                                    {complianceBreakdown && Object.keys(complianceBreakdown).length > 0 && (
                                        <div className="space-y-1.5">
                                            {Object.entries(complianceBreakdown).map(([key, detail]) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="text-[10px] text-[var(--color-text-muted)]">{detail.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        {detail.missing?.length > 0 && (
                                                            <span className="text-[8px] text-gray-400">
                                                                missing: {detail.missing.join(', ')}
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${detail.score >= 80 ? 'bg-green-50 text-green-700' : detail.score >= 50 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
                                                            }`}>
                                                            {detail.score}%
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-[9px] text-[var(--color-text-muted)] mt-2 italic">
                                        Comparing reconstructed document against {targetStyle || 'selected'} standard structure.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ═══════════════════════════════════════════════════════
                             SECTION 2: GRAMMAR & SPELLING AREA
                           ═══════════════════════════════════════════════════════ */}
                        <div className={`flex flex-col bg-white ${isGrammarOpen ? 'flex-1 overflow-hidden' : 'shrink-0'}`}>
                            {/* Grammar header */}
                            <div
                                className="px-3 py-2.5 border-b border-[var(--color-surface-200)] shrink-0 cursor-pointer hover:bg-gray-50 flex items-center justify-between transition-colors"
                                onClick={() => setIsGrammarOpen(!isGrammarOpen)}
                            >
                                <div className="flex items-center gap-1.5">
                                    <AlertCircle className={`w-4 h-4 ${unfixedCount > 0 ? 'text-orange-500' : 'text-green-500'}`} />
                                    <h3 className="font-bold text-sm text-[var(--color-text-main)]">
                                        Grammar & Spelling
                                    </h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-[10px] font-semibold text-[var(--color-text-muted)]">
                                        {resolvedCount}/{totalIssues} resolved
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isGrammarOpen ? '' : '-rotate-90'}`} />
                                </div>
                            </div>

                            {isGrammarOpen && (
                                <>
                                    {/* Filter tabs */}
                                    <div className="px-3 py-2 border-b border-[var(--color-surface-200)] shrink-0 bg-white">
                                        <Tabs value={reportFilter} onValueChange={setReportFilter}>
                                            <TabsList className="h-7 w-full bg-[var(--color-surface-100)]">
                                                <TabsTrigger value="All" className="text-[10px] h-5 px-2 flex-1">All ({issues.length})</TabsTrigger>
                                                <TabsTrigger value="Spelling" className="text-[10px] h-5 px-2 flex-1">Spelling</TabsTrigger>
                                                <TabsTrigger value="Formatting" className="text-[10px] h-5 px-2 flex-1">Format</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>

                                    {/* AutoFix All button */}
                                    {unfixedCount > 0 && (
                                        <div className="px-3 py-2 border-b border-[var(--color-surface-200)] bg-white shrink-0 flex gap-2">
                                            <button
                                                onClick={applyAllFixes}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-primary-600)] text-white text-xs font-bold hover:bg-[var(--color-primary-700)] transition-colors shadow-sm"
                                            >
                                                <Wand2 className="w-3.5 h-3.5" />
                                                Auto-Fix All ({issues.filter(i => !i.fixed && !i.ignored && i.suggestions?.length > 0).length})
                                            </button>
                                            <button
                                                onClick={ignoreAll}
                                                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-500 text-xs font-semibold hover:bg-gray-100 transition-colors"
                                            >
                                                Ignore All
                                            </button>
                                        </div>
                                    )}

                                    {/* Issue list */}
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                        {filteredIssues.length === 0 && (
                                            <div className="py-10 text-center">
                                                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                                <p className="text-xs text-[var(--color-text-muted)]">No issues to show!</p>
                                            </div>
                                        )}

                                        {filteredIssues.map((issue) => {
                                            const isActive = activeIssueId === issue.id;
                                            const hasHighlight = !!highlightMapRef.current[issue.id];
                                            let displayWord = issue.incorrectText;
                                            if (hasHighlight && reconQuillRef.current) {
                                                const text = reconQuillRef.current.getEditor().getText();
                                                const h = highlightMapRef.current[issue.id];
                                                displayWord = text.substring(h.index, h.index + h.length) || issue.incorrectText;
                                            }

                                            return (
                                                <div
                                                    key={issue.id}
                                                    onClick={() => !issue.fixed && !issue.ignored && focusIssueInEditor(issue)}
                                                    className={`p-3 rounded-xl border transition-all select-none shadow-sm ${issue.fixed
                                                        ? 'bg-green-50/80 border-green-200 opacity-70 cursor-default'
                                                        : issue.ignored
                                                            ? 'bg-gray-50 border-gray-200 opacity-60 cursor-default'
                                                            : isActive
                                                                ? 'bg-white border-[var(--color-primary-400)] ring-2 ring-[var(--color-primary-200)] cursor-pointer'
                                                                : 'bg-white border-[var(--color-surface-200)] hover:border-[var(--color-surface-300)] hover:shadow cursor-pointer'
                                                        }`}
                                                >
                                                    {/* Card header */}
                                                    <div className="flex items-start justify-between gap-1 mb-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            {issue.fixed
                                                                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                                                : issue.ignored
                                                                    ? <span className="text-gray-400 text-[9px] font-bold uppercase tracking-widest leading-none mt-0.5">IGN</span>
                                                                    : <AlertCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                                            }
                                                            <span className="text-xs font-bold text-[var(--color-text-main)] leading-tight">{issue.title}</span>
                                                        </div>
                                                        <Badge variant="default" className="text-[8px] px-1 py-0 h-4 shrink-0 bg-[var(--color-primary-500)]">{issue.type}</Badge>
                                                    </div>

                                                    {/* Misspelled word */}
                                                    {displayWord && (
                                                        <div className="mb-2">
                                                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                                                Word: <span className="font-mono bg-red-50 text-red-600 px-1 rounded border border-red-200">{displayWord}</span>
                                                            </p>
                                                        </div>
                                                    )}

                                                    {!issue.fixed && !issue.ignored && issue.suggestions?.length > 0 && (
                                                        <div className="mb-1.5">
                                                            <span className="text-[10px] text-[var(--color-text-muted)]">Auto-suggestion: </span>
                                                            <span className="text-[10px] font-bold text-[var(--color-primary-700)] bg-[var(--color-primary-50)] px-1.5 py-0.5 rounded">
                                                                {issue.suggestions[0]}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Footer */}
                                                    <div className="flex items-center justify-between pt-1.5 border-t border-[var(--color-surface-100)]">
                                                        <div className="flex items-center gap-1">
                                                            {!issue.fixed && !issue.ignored && hasHighlight && (
                                                                <span className="text-[9px] text-[var(--color-primary-600)] font-semibold flex items-center gap-0.5">
                                                                    <ChevronRight className="w-2.5 h-2.5" /> click to locate
                                                                </span>
                                                            )}
                                                        </div>

                                                        {issue.fixed ? (
                                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Resolved
                                                            </span>
                                                        ) : issue.ignored ? (
                                                            <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                                                                Ignored
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); ignoreIssue(issue); }}
                                                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-0.5"
                                                                >
                                                                    Ignore
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); fixIssue(issue); }}
                                                                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] transition-colors flex items-center gap-1"
                                                                >
                                                                    <Zap className="w-2.5 h-2.5" /> Autofix
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Global Quill styles ── */}
            <style>{`
                .va-quill-wrap { display: flex; flex-direction: column; overflow: hidden; height: 100%; }
                .va-quill-wrap .quill { display: flex; flex-direction: column; height: 100%; }
                .va-quill-wrap .ql-container { flex: 1; overflow-y: auto; font-family: 'Georgia', 'Times New Roman', serif; font-size: 14px; line-height: 1.8; }
                .va-quill-wrap .ql-editor { padding: 24px 32px; min-height: 100%; }
                .va-original .ql-editor { background: #fafaf8; color: #444; }
                .va-reconstructed .ql-editor { background: #ffffff; }
                .va-quill-wrap .ql-toolbar { background: #fff; border-bottom: 1px solid var(--color-surface-200) !important; border-top: none !important; border-left: none !important; border-right: none !important; padding: 6px 12px; }
                .va-quill-wrap .ql-container.ql-snow { border: none !important; }
                .va-quill-wrap .ql-editor p, .va-quill-wrap .ql-editor ol, .va-quill-wrap .ql-editor ul { margin-bottom: 10px; }
                .va-quill-wrap .ql-editor h1 { font-size: 1.6em; font-weight: 700; margin-bottom: 8px; }
                .va-quill-wrap .ql-editor h2 { font-size: 1.3em; font-weight: 700; margin-bottom: 8px; }
                .va-quill-wrap .ql-editor h3 { font-size: 1.1em; font-weight: 600; margin-bottom: 6px; }
                .va-original .ql-toolbar { display: none; }
            `}</style>
        </div>
    );
}
