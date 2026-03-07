import React, { useState, useEffect } from 'react';
import { Filter, CheckCircle2, AlertCircle, Loader2, Download, FileText, ArrowRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from './Button';
import { Badge } from './Badge';
import { Tabs, TabsList, TabsTrigger } from './Tabs';
import { useToast } from './Toasts';
import { marked } from 'marked';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/projects';

export function ValidationReport() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('All');
    const [fileReports, setFileReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        const fetchValidationReports = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(API_URL, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const groupedReports = [];
                res.data.forEach(project => {
                    project.files?.forEach(file => {
                        if (file.validationReport && file.validationReport.length > 0) {

                            const originalName = file.originalName || '';
                            const basename = originalName.replace(/\.[^.]+$/, '');
                            const reconstructedFile = project.files.find(f =>
                                f.originalName.startsWith(basename + '_') &&
                                f.originalName.endsWith('_reconstructed.md')
                            );

                            // Calculate total and fixed issues for this specific file
                            const totalIssues = file.validationReport.length;
                            const fixedIssues = file.validationReport.filter(r => r.fixed).length;

                            groupedReports.push({
                                id: file._id,
                                originalId: file._id,
                                projectId: project._id,
                                projectName: project.name,
                                fileName: originalName,
                                isDocx: originalName.toLowerCase().endsWith('.docx') || originalName.toLowerCase().endsWith('.doc'),
                                totalIssues,
                                fixedIssues,
                                errors: file.validationReport.slice(0, 3), // store top 3 to preview
                                reconstructedContent: reconstructedFile ? reconstructedFile.content : null,
                                reconstructedId: reconstructedFile ? reconstructedFile._id : null,
                            });
                        }
                    });
                });

                setFileReports(groupedReports.reverse());
            } catch (error) {
                console.error("Failed to fetch validation reports", error);
            } finally {
                setLoading(false);
            }
        };

        fetchValidationReports();
    }, []);

    const filteredReports = filter === 'All'
        ? fileReports
        // Since we only really have spelling issues right now in the new DB logic, we mock the filter slightly.
        : fileReports.filter(report => report.totalIssues > 0);

    const handleDelete = async (report) => {
        if (!window.confirm(`Delete validation report for "${report.fileName}"? This cannot be undone.`)) return;
        setDeletingId(report.id);
        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_URL}/${report.projectId}/files/${report.originalId}/report`,
                { report: [] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setFileReports(prev => prev.filter(r => r.id !== report.id));
            toast({ title: 'Deleted', description: `Validation report for "${report.fileName}" has been cleared.`, variant: 'success' });
        } catch {
            toast({ title: 'Error', description: 'Failed to delete the validation report.', variant: 'error' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownload = async (fileReport) => {
        if (!fileReport.reconstructedContent) {
            toast({ title: 'Error', description: 'Reconstructed file not found for this report.', variant: 'error' });
            return;
        }

        const baseName = fileReport.fileName.replace(/\.[^.]+$/, '') || 'document';

        if (fileReport.isDocx) {
            setDownloadingId(fileReport.id);
            try {
                const htmlContent = marked.parse(fileReport.reconstructedContent);
                const token = localStorage.getItem('token');
                const response = await axios.post(
                    `${API_URL}/${fileReport.projectId}/files/${fileReport.reconstructedId}/download-docx`,
                    { html: htmlContent, filename: fileReport.fileName },
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        responseType: 'blob'
                    }
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
                toast({ title: 'Success', description: 'DOCX downloaded successfully', variant: 'success' });
            } catch (error) {
                console.error('DOCX download failed:', error);
                toast({ title: 'Error', description: 'Failed to generate DOCX file.', variant: 'error' });
            } finally {
                setDownloadingId(null);
            }
        } else {
            const blob = new Blob([issue.reconstructedContent], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${baseName}_reconstructed.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: 'Success', description: 'Markdown downloaded successfully', variant: 'success' });
        }
    };

    return (
        <div className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-surface-300)] shadow-sm mt-6 mb-12 overflow-hidden">

            {/* Header & Tabs */}
            <div className="p-4 border-b border-[var(--color-surface-200)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-[var(--color-text-main)] flex items-center gap-2">
                    Validation Report
                </h2>

                <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-[var(--color-text-muted)] hidden sm:block" />
                    <Tabs value={filter} onValueChange={setFilter}>
                        <TabsList className="h-8">
                            <TabsTrigger value="All" className="text-xs h-6 px-3">All</TabsTrigger>
                            <TabsTrigger value="Citations" className="text-xs h-6 px-3">Citations</TabsTrigger>
                            <TabsTrigger value="Headings" className="text-xs h-6 px-3">Headings</TabsTrigger>
                            <TabsTrigger value="References" className="text-xs h-6 px-3">References</TabsTrigger>
                            <TabsTrigger value="Tables" className="text-xs h-6 px-3">Tables</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            {/* Issues List */}
            <div className="divide-y divide-[var(--color-surface-200)] bg-[var(--color-surface-50)] min-h-[200px] relative">
                {loading && (
                    <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-500)]" />
                    </div>
                )}

                {filteredReports.map(report => (
                    <div key={report.id} className="p-5 hover:bg-white transition-colors flex items-start gap-4">
                        <div className="mt-1 flex-shrink-0">
                            {report.totalIssues === report.fixedIssues && report.totalIssues > 0
                                ? <CheckCircle2 className="w-6 h-6 text-green-500" />
                                : <AlertCircle className="w-6 h-6 text-orange-500" />
                            }
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4 mb-2">
                                <h4 className="text-base font-bold text-[var(--color-text-main)] truncate flex items-center gap-2">
                                    Validation Report for {report.fileName}
                                </h4>
                                <Badge variant={report.totalIssues === report.fixedIssues ? "success" : "warning"} className="text-xs font-bold tracking-wider">
                                    {report.totalIssues - report.fixedIssues} Issues Found
                                </Badge>
                            </div>

                            <p className="text-sm text-[var(--color-text-muted)] mb-3 bg-red-50/50 p-2 rounded-md border border-red-100 flex items-center gap-1.5 flex-wrap">
                                <strong className="text-red-700">Identified Issues:</strong>
                                <span>{report.errors.map(err => err.description?.split(': "')[1]?.replace('"', '') || err.title || 'Unknown').filter(Boolean).join(', ')}</span>
                                {report.totalIssues > 3 ? <span className="text-xs text-red-500 font-semibold uppercase tracking-widest leading-none ml-1">+{report.totalIssues - 3} MORE</span> : ''}
                            </p>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-surface-200)]">
                                <span className="text-sm font-medium text-[var(--color-surface-400)] text-gray-500 flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                        <FileText className="w-4 h-4" />
                                        Project: <b>{report.projectName}</b>
                                    </span>
                                </span>
                                <div className="flex items-center gap-2">
                                    {report.reconstructedId && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-9 px-4 shadow-sm bg-white"
                                            onClick={() => navigate(`/validation/${report.projectId}/${report.originalId}/${report.reconstructedId}`)}
                                        >
                                            Review Side-by-Side <ArrowRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    )}
                                    {report.reconstructedContent && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 px-4 shadow-sm bg-white border-gray-300"
                                            onClick={() => handleDownload(report)}
                                            disabled={downloadingId === report.id}
                                        >
                                            {downloadingId === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                            {report.isDocx ? 'Download .docx' : 'Download .md'}
                                        </Button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(report)}
                                        disabled={deletingId === report.id}
                                        title="Delete validation report"
                                        className="h-9 w-9 flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-400 hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {deletingId === report.id
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <Trash2 className="w-4 h-4" />
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && filteredReports.length === 0 && (
                    <div className="p-12 flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1">All clean!</h3>
                        <p className="text-sm text-[var(--color-text-muted)] max-w-[250px]">
                            No validation issues found {filter !== 'All' ? `for ${filter}` : 'across your projects'}.
                        </p>
                    </div>
                )}
            </div>

        </div>
    );
}
