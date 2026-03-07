/**
 * Step 3 — Process
 * Streams the 6-agent pipeline + LLM LaTeX generation via SSE.
 * Shows real-time logs, progress bar, and stage indicators.
 */
import React, { useEffect, useRef } from "react";
import usePipelineStore from "../store/usePipelineStore";
import { streamPipeline } from "../services/pipelineApi";

export function ProcessStep() {
  const {
    uploadedFile,
    targetStyle,
    llmModel,
    processLogs,
    addProcessLog,
    clearProcessLogs,
    processingProgress,
    setProcessingProgress,
    currentStage,
    setCurrentStage,
    isProcessingDone,
    setIsProcessingDone,
    setFormattedFile,
    setComplianceScore,
    setLatexContent,
    setStep,
  } = usePipelineStore();

  const logRef = useRef(null);
  const started = useRef(false);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [processLogs]);

  // Start pipeline on mount (once)
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clearProcessLogs();
    setProcessingProgress(0);
    setCurrentStage(0);
    setIsProcessingDone(false);

    if (!uploadedFile) {
      addProcessLog({ time: now(), message: "Error: No file uploaded. Go back." });
      setIsProcessingDone(true);
      return;
    }

    let logCount = 0;

    streamPipeline(
      uploadedFile,
      targetStyle,
      llmModel,
      // onEvent
      (payload) => {
        if (payload.stage) setCurrentStage(payload.stage);
        if (payload.log) {
          addProcessLog({ time: now(), message: payload.log });
          logCount++;
          if (payload.stage === 1)      setProcessingProgress(Math.min(60, logCount * 5));
          else if (payload.stage === 2) setProcessingProgress(Math.min(95, 60 + (logCount - 12) * 4));
        }
        if (payload.stage_complete === 1) setProcessingProgress(60);
        if (payload.compliance_score)     setComplianceScore(payload.compliance_score);
        if (payload.formatted_file)       setFormattedFile(payload.formatted_file);
      },
      // onError
      (errMsg) => {
        addProcessLog({ time: now(), message: `❌ Error: ${errMsg}` });
        setIsProcessingDone(true);
      },
      // onDone
      (payload) => {
        if (payload.latex)           setLatexContent(payload.latex);
        if (payload.formatted_file)  setFormattedFile(payload.formatted_file);
        setProcessingProgress(100);
        setIsProcessingDone(true);
      }
    );
  }, []);

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-8">
      {/* Stage indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          {isProcessingDone ? "✅" : "⏳"}{" "}
          {isProcessingDone ? "Pipeline Complete" : "Processing..."}
        </span>
        <span className="text-sm font-medium text-gray-500">{processingProgress}%</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200 mb-4">
        <div
          className="h-full bg-indigo-600 transition-all duration-500 ease-in-out"
          style={{ width: `${processingProgress}%` }}
        />
      </div>

      {/* Stage pills */}
      <div className="flex gap-3 mb-1">
        <div className={`flex-1 h-1 rounded-full transition-colors ${currentStage >= 1 ? "bg-indigo-500" : "bg-gray-200"}`} />
        <div className={`flex-1 h-1 rounded-full transition-colors ${currentStage >= 2 ? "bg-indigo-500" : "bg-gray-200"}`} />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mb-5">
        <span>Static Formatting (6-agent)</span>
        <span>LaTeX Generation (LLM)</span>
      </div>

      {/* Terminal log */}
      <div
        ref={logRef}
        className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm leading-relaxed border border-gray-800"
      >
        {processLogs.map((log, i) => (
          <div key={i} className="flex gap-3 mb-0.5">
            <span className="text-gray-500 shrink-0 select-none">[{log.time}]</span>
            <span className={i === processLogs.length - 1 && !isProcessingDone ? "text-green-400" : "text-gray-300"}>
              {log.message}
            </span>
          </div>
        ))}
        {!isProcessingDone && (
          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse mt-1" />
        )}
      </div>

      {/* Done → go to Result */}
      {isProcessingDone && (
        <div className="flex justify-end mt-6">
          <button
            onClick={() => setStep(4)}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
          >
            View Results →
          </button>
        </div>
      )}
    </div>
  );
}

function now() {
  return new Date().toLocaleTimeString();
}
