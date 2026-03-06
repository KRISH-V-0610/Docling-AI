import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Book, CheckCircle, ArrowRight, ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { Badge } from '../components/Badge';
import { Progress } from '../components/Progress';
import { StepProgress } from '../components/StepProgress';
import useAppStore from '../store/useAppStore';

const steps = ["Upload", "Analyze", "Configure", "Process"];

export function Analyze() {
    const navigate = useNavigate();
    const { setStep, agents, updateAgent, validationSummary, setValidationSummary } = useAppStore();

    useEffect(() => {
        setStep(2);

        // Mock the agent analysis flow
        let timeoutIds = [];

        // 1. Start Parse Agent
        timeoutIds.push(setTimeout(() => updateAgent('parse', { status: 'Running', progress: 30 }), 500));
        timeoutIds.push(setTimeout(() => updateAgent('parse', { progress: 80 }), 1500));
        timeoutIds.push(setTimeout(() => updateAgent('parse', { status: 'Done', progress: 100 }), 2500));

        // 2. Start Interpret Agent
        timeoutIds.push(setTimeout(() => updateAgent('interpret', { status: 'Running', progress: 20 }), 2500));
        timeoutIds.push(setTimeout(() => updateAgent('interpret', { progress: 60 }), 3500));
        timeoutIds.push(setTimeout(() => updateAgent('interpret', { status: 'Done', progress: 100 }), 4500));

        // 3. Start Validate Agent
        timeoutIds.push(setTimeout(() => updateAgent('validate', { status: 'Running', progress: 10 }), 4500));
        timeoutIds.push(setTimeout(() => updateAgent('validate', { progress: 50 }), 5000));
        timeoutIds.push(setTimeout(() => {
            updateAgent('validate', { status: 'Done', progress: 100 });
            // Update validation results mocks
            setValidationSummary({
                headingsChecked: 24,
                citationsValidated: 36,
                errorsFound: 7,
                score: 82
            });
        }, 6000));

        return () => timeoutIds.forEach(clearTimeout);
    }, [setStep, updateAgent, setValidationSummary]);

    const handleNext = () => {
        setStep(3);
        navigate('/configure');
    };

    const isAllDone = Object.values(agents).every(a => a.status === 'Done');

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-3xl mx-auto py-8 px-4"
        >
            <div className="text-center mb-10">
                <h1 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-2">Analyzing Document</h1>
                <p className="text-[var(--color-text-muted)]">FormatForge agents are extracting structure and identifying formatting issues.</p>
            </div>

            <div className="bg-[var(--color-surface-200)]/60 rounded-[var(--radius-xl)] flex flex-col items-center justify-center border-2 border-dashed border-[var(--color-surface-300)] min-h-[300px] p-8 mt-12 mb-12">
                <AlertTriangle className="w-12 h-12 text-[var(--color-primary-500)] mb-4" />
                <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">Currently Under Construction</h2>
                <p className="text-[var(--color-text-muted)] text-center max-w-md">
                    The detailed agent analysis and validation pipeline is actively being built.
                </p>
            </div>

            <div className="flex justify-end mt-8">
                <Button onClick={handleNext} size="lg">
                    Continue to Configuration <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
            </div>

        </motion.div>
    );
}
