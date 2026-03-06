import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../components/Card';
import { Progress } from '../components/Progress';
import { StepProgress } from '../components/StepProgress';
import useAppStore from '../store/useAppStore';

const steps = ["Upload", "Analyze", "Configure", "Process"];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/projects';

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
    } = useAppStore();

    const [processingProgress, setProcessingProgress] = useState(0);
    const [isProcessingDone, setIsProcessingDone] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Uploading result...');

    useEffect(() => {
        setStep(4);
        clearProcessLogs();

        let isMounted = true;

        const startProcessing = async () => {
            if (!uploadedFile) {
                addProcessLog({ time: new Date().toLocaleTimeString(), message: 'Error: No file uploaded.' });
                setIsProcessingDone(true);
                return;
            }

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

                            if (payload.error && isMounted) throw new Error(payload.error);

                            if (payload.is_final && isMounted) {
                                setConvertedContent(payload.markdown);
                                setLatexContent(payload.latex);

                                // ── Upload reconstructed MD back to the project ──
                                if (reconstructProjectId) {
                                    setStatusMessage('Saving reconstructed file to project...');
                                    setProcessingProgress(95);

                                    const baseName = reconstructSourceFileName || 'document';
                                    const mdFileName = `${baseName}_reconstructed.md`;
                                    const mdBlob = new Blob([payload.markdown], { type: 'text/markdown' });
                                    const mdFile = new File([mdBlob], mdFileName, { type: 'text/markdown' });

                                    const uploadForm = new FormData();
                                    uploadForm.append('file', mdFile);

                                    const token = localStorage.getItem('token');
                                    const uploadRes = await fetch(`${API_URL}/${reconstructProjectId}/files`, {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${token}` },
                                        body: uploadForm,
                                    });

                                    if (uploadRes.ok) {
                                        const newFileData = await uploadRes.json();
                                        setProcessingProgress(100);
                                        setIsProcessingDone(true);
                                        addProcessLog({ time: new Date().toLocaleTimeString(), message: `✓ Saved as "${mdFileName}". Redirecting...` });

                                        // Short delay so the user sees the log
                                        setTimeout(() => {
                                            if (isMounted) {
                                                navigate(`/project/${reconstructProjectId}`, {
                                                    state: { activeFileId: newFileData._id }
                                                });
                                            }
                                        }, 1800);
                                    } else {
                                        throw new Error('Failed to upload reconstructed file to project.');
                                    }
                                } else {
                                    setProcessingProgress(100);
                                    setIsProcessingDone(true);
                                }
                            }
                        } catch (err) {
                            if (isMounted) {
                                addProcessLog({ time: new Date().toLocaleTimeString(), message: `Error: ${err.message}` });
                                setIsProcessingDone(true);
                            }
                        }
                    }
                }
            } catch (error) {
                if (isMounted) {
                    addProcessLog({ time: new Date().toLocaleTimeString(), message: `Error: ${error.message}` });
                    setIsProcessingDone(true);
                }
            }
        };

        startProcessing();

        return () => { isMounted = false; };
    }, [setStep, addProcessLog, clearProcessLogs, uploadedFile, targetStyle, customRules, llmEngine,
        setConvertedContent, setLatexContent, reconstructProjectId, reconstructSourceFileName, navigate]);

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

            <Card className="mt-12">
                <CardContent className="pt-8 pb-8 px-8">

                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[var(--color-text-main)] flex items-center gap-2">
                            {isProcessingDone
                                ? <CheckCircle2 className="h-5 w-5 text-[var(--color-primary-600)]" />
                                : <Play className="h-5 w-5 text-[var(--color-primary-500)] animate-pulse" />}
                            {isProcessingDone ? 'Processing Complete' : 'Processing...'}
                        </span>
                        <span className="text-sm font-medium text-[var(--color-text-muted)]">{processingProgress}%</span>
                    </div>

                    <Progress value={processingProgress} className="mb-8" />

                    {/* Terminal / Log Output */}
                    <div className="bg-gray-900 rounded-[var(--radius-lg)] p-4 h-64 overflow-y-auto font-mono text-sm leading-relaxed border border-gray-800 shadow-inner">
                        {processLogs.map((log, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-4 mb-1"
                            >
                                <span className="text-[var(--color-text-muted)] shrink-0 select-none">[{log.time}]</span>
                                <span className={`${index === processLogs.length - 1 && !isProcessingDone ? 'text-green-400' : 'text-gray-300'}`}>
                                    {log.message}
                                </span>
                            </motion.div>
                        ))}
                        {!isProcessingDone && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="mt-1 inline-block w-2 h-4 bg-green-400"
                            />
                        )}
                    </div>

                    {isProcessingDone && reconstructProjectId && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-sm text-[var(--color-primary-600)] font-semibold mt-6 flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="h-4 w-4" /> {statusMessage}
                        </motion.p>
                    )}

                </CardContent>
            </Card>
        </motion.div>
    );
}
