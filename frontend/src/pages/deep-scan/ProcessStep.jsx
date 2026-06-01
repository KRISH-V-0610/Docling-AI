// Step 3 — Process (SSE streaming via the useSSE hook).
import { useEffect, useRef, useCallback } from 'react';
import { Play, Check, ChevronRight } from 'lucide-react';
import useDeepScanStore from '../../store/useDeepScanStore';
import { useSSE } from '../../hooks/useSSE';
import { deepScanService } from '../../services';
import { StepBar } from './StepNav';
import { now } from './constants';

export function ProcessStep() {
  const {
    uploadedFile, targetStyle, llmModel,
    processLogs, addProcessLog, clearProcessLogs,
    processingProgress, setProcessingProgress,
    currentStage, setCurrentStage,
    isProcessingDone, setIsProcessingDone,
    setFormattedFile, setComplianceScore, setLatexContent,
    setAssets, setIntegrityReport, setMissingFigures,
    setStep,
  } = useDeepScanStore();

  const logRef = useRef(null);
  const started = useRef(false);
  const logCount = useRef(0);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [processLogs]);

  // Handle one parsed SSE event from the pipeline.
  const handleEvent = useCallback((payload) => {
    if (payload.error) {
      addProcessLog({ time: now(), message: `Error: ${payload.error}` });
      setIsProcessingDone(true);
      return;
    }
    if (payload.stage) setCurrentStage(payload.stage);
    if (payload.log) {
      addProcessLog({ time: now(), message: payload.log });
      logCount.current++;
      if (payload.stage === 1) setProcessingProgress(Math.min(60, logCount.current * 5));
      else if (payload.stage === 2) setProcessingProgress(Math.min(95, 60 + (logCount.current - 12) * 4));
    }
    if (payload.stage_complete === 1) setProcessingProgress(60);
    if (payload.compliance_score != null) setComplianceScore(payload.compliance_score);
    if (payload.formatted_file) setFormattedFile(payload.formatted_file);
    if (payload.integrity) setIntegrityReport(payload.integrity);
    if (payload.is_final) {
      if (payload.latex) setLatexContent(payload.latex);
      if (payload.assets) setAssets(payload.assets, payload.assets_base, payload.job);
      if (Array.isArray(payload.missing_figures)) setMissingFigures(payload.missing_figures);
      setProcessingProgress(100);
      setIsProcessingDone(true);
    }
  }, [addProcessLog, setCurrentStage, setProcessingProgress, setComplianceScore,
      setFormattedFile, setIntegrityReport, setLatexContent, setAssets,
      setMissingFigures, setIsProcessingDone]);

  const { start } = useSSE({
    onEvent: handleEvent,
    onDone: () => setIsProcessingDone(true),
    onError: (err) => {
      addProcessLog({ time: now(), message: `Connection error: ${err.message}` });
      setIsProcessingDone(true);
    },
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clearProcessLogs();
    setProcessingProgress(0);
    setCurrentStage(0);
    setIsProcessingDone(false);
    logCount.current = 0;

    if (!uploadedFile) {
      addProcessLog({ time: now(), message: 'Error: No file uploaded. Go back.' });
      setIsProcessingDone(true);
      return;
    }

    addProcessLog({ time: now(), message: 'Starting static formatting engine...' });
    addProcessLog({ time: now(), message: `Style: ${targetStyle} | File: ${uploadedFile.name}` });

    const { url, init } = deepScanService.pipelineStreamArgs(uploadedFile, { style: targetStyle, model: llmModel });
    start(url, init);
    // useSSE aborts the stream automatically on unmount (no leak).
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stageLabel = currentStage >= 2
    ? 'Stage 2: LLM-based LaTeX generation'
    : currentStage >= 1
      ? 'Stage 1: Static formatting engine (6-agent pipeline)'
      : 'Initializing...';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-2">Processing Document</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{stageLabel}</p>
      </div>

      <StepBar currentStep={3} onStepClick={(s) => isProcessingDone && s < 3 && setStep(s)} disabled={!isProcessingDone} />

      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-surface-200)] p-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[var(--color-text-main)] flex items-center gap-2">
            {isProcessingDone ? <Check className="w-4 h-4 text-green-600" /> : <Play className="w-4 h-4 text-[var(--color-primary-600)]" />}
            {isProcessingDone ? 'Pipeline Complete' : 'Processing...'}
          </span>
          <span className="text-sm font-semibold text-[var(--color-text-muted)]">{processingProgress}%</span>
        </div>

        <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-200)] mb-4">
          <div className="h-full bg-[var(--color-primary-600)] transition-all duration-500" style={{ width: `${processingProgress}%` }} />
        </div>

        <div className="flex gap-3 mb-1">
          <div className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${currentStage >= 1 ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-surface-200)]'}`} />
          <div className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${currentStage >= 2 ? 'bg-[var(--color-primary-500)]' : 'bg-[var(--color-surface-200)]'}`} />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mb-5">
          <span>Static Formatting</span>
          <span>LaTeX Generation</span>
        </div>

        <style>{`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
        <div ref={logRef} className="bg-[var(--color-primary-600)] rounded-xl p-5 h-72 w-full overflow-y-auto no-scrollbar font-mono text-sm leading-relaxed border border-[var(--color-surface-300)] shadow-inner flex flex-col">
          <div className="flex-1">
            {processLogs.map((log, i) => (
              <div key={i} className="flex gap-4 mb-2">
                <span className="text-[var(--color-surface-200)] shrink-0 select-none opacity-80">[{log.time}]</span>
                <span className={
                  i === processLogs.length - 1 && !isProcessingDone ? 'text-green-300 font-bold'
                    : log.message.startsWith('Error') ? 'text-red-400 font-bold'
                      : log.message.includes('complete') || log.message.includes('Complete') ? 'text-green-300'
                        : 'text-[#fffcf0]'
                }>
                  {log.message}
                </span>
              </div>
            ))}
            {!isProcessingDone && <span className="mt-2 inline-block w-2.5 h-5 bg-green-300 animate-pulse" />}
          </div>
        </div>

        {isProcessingDone && (
          <div className="flex justify-end mt-6">
            <button onClick={() => setStep(4)} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]">
              View LaTeX <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
