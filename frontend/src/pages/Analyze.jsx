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
            className="max-w-4xl mx-auto py-8"
        >
            <div className="text-center mb-10">
                <h1 className="text-3xl font-bold Tracking-tight mb-2">Analyzing Document</h1>
                <p className="text-[var(--color-text-muted)]">FormatForge agents are extracting structure and identifying formatting issues.</p>
            </div>

            <StepProgress currentStep={2} steps={steps} />

            {/* Agents Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 mt-12">
                <AgentCard
                    title="Agent: Parse"
                    description="Parsing structure & text"
                    icon={<FileText className="h-6 w-6 text-blue-500" />}
                    data={agents.parse}
                />
                <AgentCard
                    title="Agent: Interpret"
                    description="Applying style guidelines"
                    icon={<Book className="h-6 w-6 text-purple-500" />}
                    data={agents.interpret}
                />
                <AgentCard
                    title="Agent: Validate"
                    description="Checking citations & headings"
                    icon={<Activity className="h-6 w-6 text-green-500" />}
                    data={agents.validate}
                />
            </div>

            {/* Validation Summary - Only show when Done */}
            <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: isAllDone ? 1 : 0, height: isAllDone ? 'auto' : 0 }}
                className="overflow-hidden"
            >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" /> Validation Summary
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <SummaryTile label="Headings Checked" value={validationSummary.headingsChecked} />
                    <SummaryTile label="Citations Validated" value={validationSummary.citationsValidated} />
                    <SummaryTile label="Errors Found" value={validationSummary.errorsFound} highlight={validationSummary.errorsFound > 0} />
                    <SummaryTile label="Formatting Score" value={`${validationSummary.score}%`} />
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleNext} size="lg">
                        Configure Processing <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </motion.div>

        </motion.div>
    );
}

function AgentCard({ title, description, icon, data }) {
    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    {icon}
                    <CardTitle className="text-base">{title}</CardTitle>
                </div>
                <Badge variant={data.status}>{data.status}</Badge>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">{description}</p>
                <div className="flex items-center gap-3">
                    <Progress value={data.progress} className="h-2 flex-1" />
                    <span className="text-xs font-medium w-8 text-right">{data.progress}%</span>
                </div>
            </CardContent>
        </Card>
    );
}

function SummaryTile({ label, value, highlight }) {
    return (
        <Card className={`border ${highlight ? 'border-orange-200 bg-orange-50/50' : 'border-[var(--color-surface-200)]'}`}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <p className="text-sm text-[var(--color-text-muted)] mb-1">{label}</p>
                <p className={`text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-[var(--color-text-main)]'}`}>
                    {value}
                </p>
            </CardContent>
        </Card>
    );
}
