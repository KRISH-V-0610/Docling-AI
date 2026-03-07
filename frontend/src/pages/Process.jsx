import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle2, SplitSquareHorizontal, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/Card';
import { Progress } from '../components/Progress';
import { StepProgress } from '../components/StepProgress';
import { Button } from '../components/Button';
import useAppStore from '../store/useAppStore';

const steps = ["Upload", "Analyze", "Configure", "Process"];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/projects';

export function Process() {
    const navigate = useNavigate();
    const {
        setStep,
        processLogs,
        addProcessLog,
        clearProcessLogs,
        uploadedFile,
        targetStyle,
        customRules,
        llmEngine,
        setConvertedContent,
        setLatexContent,
        reconstructProjectId,
        reconstructSourceFileName,
        setIsProcessing
    } = useAppStore();

    const [processingProgress, setProcessingProgress] = useState(0);
    const [isProcessingDone, setIsProcessingDone] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Uploading result...');
    const [reconstructedFileId, setReconstructedFileId] = useState(null);
    const [originalFileId, setOriginalFileId] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);
    const logsEndRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [processLogs]);

    useEffect(() => {
        setStep(4);
        clearProcessLogs();
        setIsProcessing(true);

        let isMounted = true;

        const startProcessing = async () => {
            if (!uploadedFile) {
                addProcessLog({ time: new Date().toLocaleTimeString(), message: 'Error: No file uploaded.' });
                setIsProcessingDone(true);
                setIsProcessing(false);
                return;
            }

            // We implicitly know the original ID if we can query the project, but we'll try to find it via API 
            // In a real flow, we should pass originalFileId directly from the Workspace. We'll fetch it here for now if needed, 
            // or we'll just let the ValidationArea handle matching by name.

            const formData = new FormData();
            formData.append('file', uploadedFile);
            formData.append('format_style', targetStyle);
            formData.append('custom_rules', customRules);
            formData.append('model', llmEngine);

            try {
                const response = await fetch('http://127.0.0.1:8000/api/v2/reconstruct/stream', {
                    method: 'POST',
                    body: formData
                });

                if (!response.body) throw Error('ReadableStream not supported');

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');

                let done = false;
                let buffer = '';
                let logCount = 0;

                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;

                    if (value) buffer += decoder.decode(value, { stream: true });

                    const chunks = buffer.split('\n\n');
                    buffer = chunks.pop();

                    for (const chunk of chunks) {
                        if (!chunk.trim()) continue;
                        if (!chunk.startsWith('data: ')) continue;

                        try {
                            const payload = JSON.parse(chunk.substring(6));

                            if (payload.log && isMounted) {
                                addProcessLog({ time: new Date().toLocaleTimeString(), message: payload.log });
                                logCount++;
                                setProcessingProgress(Math.min(90, logCount * 5));
                            }

                            if (payload.errors && Array.isArray(payload.errors) && isMounted) {
                                setValidationErrors(prev => {
                                    const newErrors = [...new Set([...prev, ...payload.errors])];
                                    return newErrors;
                                });
                            }

                            if (payload.error && isMounted) throw new Error(payload.error);

                            if (payload.is_final && isMounted) {
                                setConvertedContent(payload.markdown);
                                setLatexContent(payload.latex);

                                // ── Upload reconstructed MD back to the project ──
                                if (reconstructProjectId) {
                                    setStatusMessage('Saving reconstructed file to project...');
                                    setProcessingProgress(95);

                                    const baseName = reconstructSourceFileName || 'document';
                                    const mdFileName = `${baseName}_${targetStyle}_reconstructed.md`;
                                    const mdBlob = new Blob([payload.markdown], { type: 'text/markdown' });
                                    const mdFile = new File([mdBlob], mdFileName, { type: 'text/markdown' });

                                    const uploadForm = new FormData();
                                    uploadForm.append('file', mdFile, mdFileName);

                                    const token = localStorage.getItem('token');
                                    const uploadRes = await fetch(`${API_URL}/${reconstructProjectId}/files`, {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${token}` },
                                        body: uploadForm,
                                    });

                                    if (uploadRes.ok) {
                                        const newFileData = await uploadRes.json();
                                        setReconstructedFileId(newFileData._id);

                                        // Also upload the generated LaTeX (.tex) file
                                        setStatusMessage('Saving reconstructed LaTeX file...');
                                        const texFileName = `${baseName}_${targetStyle}_latex.tex`;
                                        const texBlob = new Blob([payload.latex], { type: 'text/plain' });
                                        const texFile = new File([texBlob], texFileName, { type: 'text/plain' });

                                        const texUploadForm = new FormData();
                                        texUploadForm.append('file', texFile, texFileName);

                                        await fetch(`${API_URL}/${reconstructProjectId}/files`, {
                                            method: 'POST',
                                            headers: { Authorization: `Bearer ${token}` },
                                            body: texUploadForm,
                                        });

                                        // Attempt to get the original file ID for comparison
                                        try {
                                            const projRes = await fetch(`${API_URL}/${reconstructProjectId}`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            if (projRes.ok) {
                                                const projData = await projRes.json();
                                                // Find the file whose name matches the reconstructSourceFileName ignoring extension
                                                const ogFile = projData.files?.find(f => {
                                                    const fBase = f.originalName.replace(/\.[^.]+$/, '');
                                                    return fBase === reconstructSourceFileName && f._id !== newFileData._id;
                                                });
                                                if (ogFile) {
                                                    setOriginalFileId(ogFile._id);

                                                    // Save validation report against original file ID
                                                    const finalErrors = Array.isArray(payload.errors)
                                                        ? payload.errors
                                                        : [];

                                                    if (finalErrors.length > 0) {
                                                        const reportPayload = finalErrors.map((word, i) => {
                                                            const correctionRaw = payload.corrections?.[word];
                                                            let suggestions = [];

                                                            if (correctionRaw && correctionRaw !== word) {
                                                                suggestions.push(correctionRaw);
                                                            } else {
                                                                // Provide a fallback suggestion that is guaranteed to be different
                                                                // so the Autofix button actually changes the text
                                                                if (word === word.toUpperCase() && word.length > 2) {
                                                                    suggestions.push(word.charAt(0) + word.slice(1).toLowerCase());
                                                                } else if (word === word.toLowerCase()) {
                                                                    suggestions.push(word.charAt(0).toUpperCase() + word.slice(1));
                                                                } else {
                                                                    suggestions.push(word.toLowerCase());
                                                                }
                                                            }

                                                            return {
                                                                id: Date.now() + i,
                                                                type: 'Spelling',
                                                                title: 'Spelling Error',
                                                                description: `Possible misspelling detected: "${word}"`,
                                                                suggestions,
                                                                location: 'Entire Document',
                                                                fixed: false
                                                            };
                                                        });

                                                        await fetch(`${API_URL}/${reconstructProjectId}/files/${ogFile._id}/report`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                            body: JSON.stringify({ report: reportPayload })
                                                        });
                                                    }
                                                }
                                            }
                                        } catch (e) { console.error("Could not fetch or update original ID report", e); }

                                        setProcessingProgress(100);
                                        setIsProcessingDone(true);
                                        setIsProcessing(false);
                                        addProcessLog({ time: new Date().toLocaleTimeString(), message: `✓ Saved as "${mdFileName}". Ready for validation.` });
                                        setStatusMessage('Reconstruction complete. Choose an action below.');
                                    } else {
                                        const errText = await uploadRes.text();
                                        throw new Error(`Failed to upload reconstructed file. Server says: ${uploadRes.status} ${errText}`);
                                    }
                                } else {
                                    setProcessingProgress(100);
                                    setIsProcessingDone(true);
                                    setIsProcessing(false);
                                }
                            }
                        } catch (err) {
                            if (isMounted) {
                                addProcessLog({ time: new Date().toLocaleTimeString(), message: `Error: ${err.message}` });
                                setIsProcessingDone(true);
                                setIsProcessing(false);
                            }
                        }
                    }
                }
            } catch (error) {
                if (isMounted) {
                    addProcessLog({ time: new Date().toLocaleTimeString(), message: `Error: ${error.message}` });
                    setIsProcessingDone(true);
                    setIsProcessing(false);
                }
            }
        };

        startProcessing();

        return () => {
            isMounted = false;
            // Cleanup in case unmounted mid-process
            setIsProcessing(false);
        };
    }, [setStep, addProcessLog, clearProcessLogs, uploadedFile, targetStyle, customRules, llmEngine,
        setConvertedContent, setLatexContent, reconstructProjectId, reconstructSourceFileName, setIsProcessing]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-3xl mx-auto py-8 px-4"
        >
            <div className="text-center mb-10">
                <h1 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-2">Processing Document</h1>
                <p className="text-[var(--color-text-muted)]">Applying formatting rules and generating output.</p>
            </div>

            <StepProgress currentStep={4} steps={steps} />

            <Card className="mt-12 border-[var(--color-surface-300)] shadow-[var(--shadow-card)]">
                <CardContent className="pt-8 pb-8 px-8 flex flex-col items-center">

                    <div className="flex items-center justify-between mb-2 w-full">
                        <span className="text-sm font-semibold text-[var(--color-text-main)] flex items-center gap-2">
                            {isProcessingDone
                                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                                : <Play className="h-5 w-5 text-[var(--color-primary-500)] animate-pulse" />}
                            {isProcessingDone ? 'Processing Complete' : 'Processing...'}
                        </span>
                        <span className="text-sm font-medium text-[var(--color-text-muted)]">{processingProgress}%</span>
                    </div>

                    <Progress value={processingProgress} className="mb-8 w-full bg-[var(--color-surface-200)] [&>div]:bg-[var(--color-primary-500)]" />

                    {/* Terminal / Log Output - Themed for Docling & Auto-scrolling & Hidden Scrollbar */}
                    <style>{`
                        .no-scrollbar::-webkit-scrollbar { display: none; }
                        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>
                    <div className="bg-[var(--color-primary-600)] rounded-[var(--radius-lg)] p-5 h-64 w-full overflow-y-auto no-scrollbar font-mono text-sm leading-relaxed border border-[var(--color-surface-300)] shadow-inner flex flex-col">
                        <div className="flex-1">
                            {processLogs.map((log, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex gap-4 mb-2"
                                >
                                    <span className="text-[var(--color-surface-200)] shrink-0 select-none opacity-80">[{log.time}]</span>
                                    <span className={`${index === processLogs.length - 1 && !isProcessingDone ? 'text-green-300 font-bold' : 'text-[#fffcf0]'}`}>
                                        {log.message}
                                    </span>
                                </motion.div>
                            ))}
                            {!isProcessingDone && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 0] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="mt-2 inline-block w-2.5 h-5 bg-green-300"
                                />
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    {isProcessingDone && reconstructProjectId && reconstructedFileId && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full mt-8 flex flex-col items-center gap-6"
                        >
                            <p className="text-center text-sm text-[var(--color-primary-600)] font-semibold flex items-center justify-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> {statusMessage}
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 w-full px-4 justify-center">
                                <Button
                                    variant="secondary"
                                    className="px-6 py-3 text-sm flex-1 whitespace-nowrap"
                                    onClick={() => navigate(`/project/${reconstructProjectId}`, { state: { activeFileId: reconstructedFileId } })}
                                >
                                    Return to Workspace
                                </Button>
                                <Button
                                    variant="primary"
                                    className="px-6 py-3 text-sm flex items-center justify-center gap-2 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-900)] flex-1 whitespace-nowrap"
                                    onClick={() => {
                                        if (originalFileId) {
                                            navigate(`/validation/${reconstructProjectId}/${originalFileId}/${reconstructedFileId}`);
                                        } else {
                                            navigate(`/validation/${reconstructProjectId}/unknown/${reconstructedFileId}`);
                                        }
                                    }}
                                >
                                    <SplitSquareHorizontal className="w-4 h-4" /> Compare in Validation Area
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="px-6 py-3 text-sm flex items-center justify-center gap-2 border-[var(--color-primary-500)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-50)] flex-1 whitespace-nowrap"
                                    onClick={() => {
                                        // Auto-download the Markdown file
                                        if (convertedContent) {
                                            const blob = new Blob([convertedContent], { type: 'text/markdown' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = reconstructSourceFileName ? `${reconstructSourceFileName.replace(/\.[^.]+$/, '')}_reconstructed.md` : 'reconstructed.md';
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        }
                                        // Navigate to DocBot with context
                                        navigate('/advance-workshop', { state: { activeArtifactId: reconstructedFileId } });
                                    }}
                                >
                                    <Bot className="w-4 h-4" /> Open in DocBot
                                </Button>
                            </div>
                        </motion.div>
                    )}

                </CardContent>
            </Card>
        </motion.div>
    );
}
