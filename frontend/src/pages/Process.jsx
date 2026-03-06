import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import { Progress } from '../components/Progress';
import { StepProgress } from '../components/StepProgress';
import useAppStore from '../store/useAppStore';

const steps = ["Upload", "Analyze", "Configure", "Process"];

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
        setLatexContent
    } = useAppStore();

    const [processingProgress, setProcessingProgress] = useState(0);
    const [isProcessingDone, setIsProcessingDone] = useState(false);

    useEffect(() => {
        setStep(4);
        clearProcessLogs();

        let isMounted = true;

        const startProcessing = async () => {
            if (!uploadedFile) {
                const now = new Date();
                addProcessLog({ time: now.toLocaleTimeString(), message: "Error: No file uploaded." });
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
                const decoder = new TextDecoder("utf-8");

                let done = false;
                let buffer = "";
                let logCount = 0;

                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;

                    if (value) {
                        buffer += decoder.decode(value, { stream: true });
                    }

                    const chunks = buffer.split("\n\n");
                    buffer = chunks.pop();

                    for (const chunk of chunks) {
                        if (chunk.trim() === "") continue;

                        if (chunk.startsWith("data: ")) {
                            try {
                                const jsonStr = chunk.substring(6);
                                const payload = JSON.parse(jsonStr);

                                if (payload.log && isMounted) {
                                    const now = new Date();
                                    addProcessLog({ time: now.toLocaleTimeString(), message: payload.log });
                                    logCount++;
                                    // Estimate progress, cap at 95% until final
                                    setProcessingProgress(Math.min(95, logCount * 5));
                                }

                                if (payload.is_final && isMounted) {
                                    setConvertedContent(payload.markdown);
                                    setLatexContent(payload.latex);
                                    setProcessingProgress(100);
                                    setIsProcessingDone(true);
                                }

                                if (payload.error && isMounted) {
                                    throw new Error(payload.error);
                                }
                            } catch (err) {
                                console.warn("Failed to parse SSE payload block", err);
                            }
                        }
                    }
                }
            } catch (error) {
                if (isMounted) {
                    const now = new Date();
                    addProcessLog({ time: now.toLocaleTimeString(), message: `Error: ${error.message}` });
                    setIsProcessingDone(true);
                }
            }
        };

        startProcessing();

        return () => {
            isMounted = false;
        };
    }, [setStep, addProcessLog, clearProcessLogs, uploadedFile, targetStyle, customRules, llmEngine, setConvertedContent, setLatexContent]);

    const handleOpenEditor = () => {
        navigate('/editor');
    };

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
                            {isProcessingDone ? <CheckCircle2 className="h-5 w-5 text-[var(--color-primary-600)]" /> : <Play className="h-5 w-5 text-[var(--color-primary-500)] animate-pulse" />}
                            {isProcessingDone ? "Processing Complete" : "Processing..."}
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

                </CardContent>
            </Card>

            {isProcessingDone && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end mt-6"
                >
                    <Button onClick={handleOpenEditor} size="lg" variant="primary">
                        Open Editor <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </motion.div>
            )}

        </motion.div>
    );
}
