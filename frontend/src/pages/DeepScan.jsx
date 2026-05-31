/**
 * Deep Scan Tool — Standalone 5-Step Pipeline Wizard
 * ====================================================
 * Upload → Configure → Process → LaTeX → Agent
 *
 * Self-contained: uses useDeepScanStore (isolated from main app store).
 * Backend: unified backend_ai service (port 8000), /deepscan sub-router.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Settings, Play, Code2, Bot, ChevronRight, ChevronLeft,
  FileText, CloudUpload, X, Check, Loader2, Download, Send,
  RotateCcw, AlertTriangle, Microscope, BookOpen, List, FileDown
} from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import * as docx from 'docx-preview';
import useDeepScanStore from '../store/useDeepScanStore';
import { ENDPOINTS, authHeaders } from '../config/api';

const PIPELINE_API = ENDPOINTS.deepScan;

const STYLES = [
  { id: 'ieee', label: 'IEEE' },
  { id: 'apa7', label: 'APA 7th' },
  { id: 'vancouver', label: 'Vancouver' },
  { id: 'mla', label: 'MLA' },
  { id: 'chicago', label: 'Chicago' },
];

const STEPS = ['Upload', 'Configure', 'Process', 'LaTeX', 'Agent'];
const STEP_ICONS = [Upload, Settings, Play, Code2, Bot];

// ═══════════════════════════════════════════════════════════
//  Step Bar
// ═══════════════════════════════════════════════════════════
function StepBar({ currentStep, onStepClick, disabled }) {
  const fill = STEPS.length > 1 ? ((currentStep - 1) / (STEPS.length - 1)) * 100 : 0;
  return (
    <div className={`relative flex items-center justify-between w-full max-w-2xl mx-auto px-4 mb-8 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
      <div className="absolute left-[10%] right-[10%] top-[18px] h-[3px] bg-[var(--color-surface-200)] rounded-full z-0 overflow-hidden">
        <div className="h-full bg-[var(--color-primary-600)] transition-all duration-700" style={{ width: `${fill}%` }} />
      </div>
      {STEPS.map((label, idx) => {
        const num = idx + 1;
        const active = num === currentStep;
        const done = num < currentStep;
        const Icon = STEP_ICONS[idx];
        return (
          <div key={label} className={`flex flex-col items-center relative z-10 w-16 ${done && !disabled ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => done && !disabled && onStepClick(num)}>
            <div className={`w-9 h-9 flex items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${active
              ? 'bg-white border-[var(--color-primary-600)] text-[var(--color-primary-600)] shadow-md ring-4 ring-[var(--color-primary-50)] scale-110'
              : done
                ? 'bg-[var(--color-primary-600)] border-[var(--color-primary-600)] text-white'
                : 'bg-[var(--color-surface-50)] border-[var(--color-surface-300)] text-[var(--color-text-muted)]'
              }`}>
              {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <span className={`mt-2 text-xs font-semibold whitespace-nowrap ${active || done ? 'text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)]'
              }`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Sidebar Nav
// ═══════════════════════════════════════════════════════════
function SidebarNav({ currentStep, onStepClick, disabled }) {
  return (
    <div className="w-44 shrink-0 bg-[var(--color-surface-50)] border-r border-[var(--color-surface-200)] flex flex-col py-4">
      <div className="px-4 mb-6">
        <h2 className="text-[11px] font-bold text-[var(--color-text-muted)] tracking-widest uppercase">Pipeline</h2>
      </div>
      {STEPS.map((label, idx) => {
        const num = idx + 1;
        const active = num === currentStep;
        const done = num < currentStep;
        const Icon = STEP_ICONS[idx];
        return (
          <button
            key={label}
            onClick={() => (done || active) && !disabled && onStepClick(num)}
            disabled={disabled}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${active
              ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border-r-2 border-[var(--color-primary-600)]'
              : done
                ? 'text-[var(--color-text-main)] hover:bg-[var(--color-surface-100)] cursor-pointer'
                : 'text-[var(--color-text-muted)] cursor-default'
              } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Header Nav
// ═══════════════════════════════════════════════════════════
function HeaderNav({ currentStep, onStepClick }) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-[var(--color-surface-200)]">
      {STEPS.map((label, idx) => {
        const num = idx + 1;
        const active = num === currentStep;
        const done = num < currentStep;
        const Icon = STEP_ICONS[idx];
        return (
          <button
            key={label}
            onClick={() => (done || active) && onStepClick(num)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${active
              ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
              : done
                ? 'text-[var(--color-text-main)] hover:bg-[var(--color-surface-100)] cursor-pointer'
                : 'text-[var(--color-text-muted)] cursor-default'
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Step 1 — Upload
// ═══════════════════════════════════════════════════════════
function UploadStep() {
  const { uploadedFile, setUploadedFile, removeFile, setStep } = useDeepScanStore();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && (f.name.endsWith('.docx') || f.name.endsWith('.pdf'))) {
      setUploadedFile(f);
    } else {
      alert('Please upload a .docx or .pdf file.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-2">Upload Manuscript</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Upload your <code className="bg-[var(--color-surface-100)] px-1 rounded text-xs">.docx</code> file to begin the automated formatting process.
        </p>
      </div>

      <StepBar currentStep={1} onStepClick={() => { }} disabled={false} />

      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-surface-200)] p-8">
        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors ${dragging ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]' : 'border-[var(--color-surface-300)] hover:border-[var(--color-surface-400)]'
              }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".docx,.pdf" className="hidden" onChange={(e) => e.target.files?.[0] && setUploadedFile(e.target.files[0])} />
            <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-primary-100)] flex items-center justify-center mb-4">
              <CloudUpload className="w-7 h-7 text-[var(--color-primary-600)]" />
            </div>
            <p className="font-semibold text-[var(--color-text-main)]">Drag and drop your manuscript (.docx) or click to upload</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Maximum file size 50MB. Word documents (.docx) preferred.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 bg-[var(--color-primary-50)] rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[var(--color-primary-600)]" />
            </div>
            <p className="text-lg font-bold text-[var(--color-text-main)] truncate max-w-xs">{uploadedFile.name}</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <div className="flex gap-3">
              <button onClick={removeFile} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-surface-300)] text-[var(--color-text-main)] bg-white hover:bg-[var(--color-surface-50)]">
                <X className="w-4 h-4" /> Remove
              </button>
              <button onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]">
                Next: Configure <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Step 2 — Configure
// ═══════════════════════════════════════════════════════════
function ConfigureStep() {
  const { targetStyle, setTargetStyle, setStep } = useDeepScanStore();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-text-main)] mb-2">Configure Formatting</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Select your target formatting style.</p>
      </div>

      <StepBar currentStep={2} onStepClick={(s) => setStep(s)} disabled={false} />

      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-surface-200)] p-8">
        <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-4">Target Formatting Style</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-8">
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setTargetStyle(s.id)}
              className={`px-3 py-3 text-sm font-semibold rounded-lg border transition-colors ${targetStyle === s.id
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                : 'border-[var(--color-surface-200)] bg-white text-[var(--color-text-main)] hover:bg-[var(--color-surface-50)]'
                }`}
            >
              {s.label} {targetStyle === s.id && <Check className="w-3.5 h-3.5 inline ml-1" />}
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-10">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-surface-300)] text-[var(--color-text-main)] bg-white hover:bg-[var(--color-surface-50)]">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => setStep(3)} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]">
            Start Processing <Play className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Step 3 — Process (SSE streaming)
// ═══════════════════════════════════════════════════════════
function ProcessStep() {
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

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [processLogs]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    clearProcessLogs();
    setProcessingProgress(0);
    setCurrentStage(0);
    setIsProcessingDone(false);

    if (!uploadedFile) {
      addProcessLog({ time: now(), message: 'Error: No file uploaded. Go back.' });
      setIsProcessingDone(true);
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadedFile, uploadedFile.name);
    formData.append('style', targetStyle);
    formData.append('model', llmModel);

    addProcessLog({ time: now(), message: 'Starting static formatting engine...' });
    addProcessLog({ time: now(), message: `Style: ${targetStyle} | File: ${uploadedFile.name}` });

    let logCount = 0;

    fetch(`${PIPELINE_API}/api/v2/pipeline/stream`, { method: 'POST', headers: authHeaders(), body: formData })
      .then(async (response) => {
        if (!response.body) throw new Error('ReadableStream not supported');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split('\n\n');
          buffer = chunks.pop();

          for (const chunk of chunks) {
            if (!chunk.trim() || !chunk.startsWith('data: ')) continue;
            try {
              const payload = JSON.parse(chunk.substring(6));
              console.log('Deep Scan Pipeline:', payload);

              if (payload.stage) setCurrentStage(payload.stage);
              if (payload.log) {
                addProcessLog({ time: now(), message: payload.log });
                logCount++;
                if (payload.stage === 1) setProcessingProgress(Math.min(60, logCount * 5));
                else if (payload.stage === 2) setProcessingProgress(Math.min(95, 60 + (logCount - 12) * 4));
              }
              if (payload.stage_complete === 1) setProcessingProgress(60);
              if (payload.compliance_score != null) setComplianceScore(payload.compliance_score);
              if (payload.formatted_file) setFormattedFile(payload.formatted_file);
              if (payload.integrity) setIntegrityReport(payload.integrity);
              if (payload.is_final) {
                if (payload.latex) setLatexContent(payload.latex);
                if (payload.formatted_file) setFormattedFile(payload.formatted_file);
                if (payload.integrity) setIntegrityReport(payload.integrity);
                if (payload.assets) setAssets(payload.assets, payload.assets_base, payload.job);
                if (Array.isArray(payload.missing_figures)) setMissingFigures(payload.missing_figures);
                setProcessingProgress(100);
                setIsProcessingDone(true);
                return;
              }
              if (payload.error) throw new Error(payload.error);
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) {
                addProcessLog({ time: now(), message: `Error: ${e.message}` });
                setIsProcessingDone(true);
                return;
              }
            }
          }
        }
        setIsProcessingDone(true);
      })
      .catch((err) => {
        addProcessLog({ time: now(), message: `Connection error: ${err.message}` });
        setIsProcessingDone(true);
      });
  }, []);

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

// ═══════════════════════════════════════════════════════════
//  Step 4 — LaTeX Editor
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  Content-integrity banner (Phase C — no-data-loss check)
// ═══════════════════════════════════════════════════════════
function IntegrityBanner({ report }) {
  if (!report) return null;
  const sev = report.severity || 'info';
  const cfg = {
    info: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: Check, label: 'Content preserved' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: AlertTriangle, label: 'Review recommended' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: AlertTriangle, label: 'Possible content loss' },
  }[sev] || {};
  const Icon = cfg.icon || Check;
  const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

  return (
    <div className={`mx-6 mt-3 rounded-lg border ${cfg.border} ${cfg.bg} px-4 py-3`}>
      <div className={`flex items-center gap-2 text-sm font-semibold ${cfg.text}`}>
        <Icon className="w-4 h-4 shrink-0" />
        Content Integrity: {cfg.label}
        <span className="ml-auto font-normal text-xs opacity-80">
          words {report.word_count_out}/{report.word_count_in} ({pct(report.word_retention_ratio)})
          {' · '}figures {report.figure_count_out}/{report.figure_count_in}
          {report.table_count_in > 0 && <>{' · '}tables {report.table_count_out}/{report.table_count_in}</>}
          {' · '}similarity {pct(report.token_similarity)}
        </span>
      </div>
      {Array.isArray(report.notes) && report.notes.length > 0 && (
        <ul className={`mt-1.5 ml-6 list-disc text-xs ${cfg.text} opacity-90 space-y-0.5`}>
          {report.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

// Phase I — prompt the user to upload an image for each figure the pipeline
// detected but couldn't extract (e.g. EMF/WMF vector charts). On upload the
// backend fills the placeholder slot in the LaTeX and returns the updated source.
function MissingFiguresPanel({ missingFigures, jobId, latexContent, setLatexContent, resolveFigure }) {
  const [busyN, setBusyN] = useState(null);
  const [error, setError] = useState(null);
  if (!missingFigures || missingFigures.length === 0) return null;

  const upload = async (fig, fileEl) => {
    const f = fileEl?.files?.[0];
    if (!f) return;
    setBusyN(fig.n);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('latex', latexContent || '');
      const res = await fetch(`${PIPELINE_API}/api/v2/assets/${jobId}/${fig.n}`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.detail || `Upload failed (${res.status})`);
      if (data.latex) setLatexContent(data.latex);
      resolveFigure(fig.n);
    } catch (e) {
      setError(`Figure ${fig.n}: ${e.message}`);
    } finally {
      setBusyN(null);
      if (fileEl) fileEl.value = '';
    }
  };

  return (
    <div className="mx-6 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {missingFigures.length} figure{missingFigures.length > 1 ? 's' : ''} need an image
      </div>
      <p className="mt-1 text-xs opacity-90">
        These figures couldn't be extracted from your document (often vector charts).
        Upload an image for each, then recompile — it renders in place.
      </p>
      <div className="mt-2.5 space-y-2">
        {missingFigures.map((fig) => (
          <div key={fig.n} className="flex items-center gap-3 rounded-md border border-amber-200 bg-white/70 px-3 py-2">
            <span className="text-xs font-medium">
              Figure {fig.n}{fig.caption ? ` — ${fig.caption}` : ''}
            </span>
            <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500">
              {busyN === fig.n ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {busyN === fig.n ? 'Uploading…' : 'Upload image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busyN === fig.n}
                onChange={(e) => upload(fig, e.target)}
              />
            </label>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function LaTeXStep() {
  const { latexContent, setLatexContent, setStep, integrityReport, jobId,
    missingFigures, resolveFigure } = useDeepScanStore();
  const [compiling, setCompiling] = useState(false);
  const [outline, setOutline] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [compileError, setCompileError] = useState(null);
  const [compileNotes, setCompileNotes] = useState([]);

  useEffect(() => {
    if (!latexContent) return;
    const items = [];
    const lines = latexContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/\\(section|subsection|subsubsection)\{(.+?)\}/);
      if (m) items.push({ level: m[1], title: m[2], line: i + 1 });
    }
    setOutline(items);
  }, [latexContent]);

  // Compile path (Phase D): local tectonic only — figure assets + server-side
  // auto-correct. No external/texlive.net fallback by design; on failure the
  // error is surfaced so it can be fixed.
  const compilePdf = async () => {
    setCompiling(true);
    setCompileError(null);
    setCompileNotes([]);
    try {
      const res = await fetch(ENDPOINTS.deepScanCompile, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ latex: latexContent, job: jobId || null }),
      });

      const ctype = res.headers.get('content-type') || '';

      if (res.ok && ctype.includes('application/pdf')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
        try {
          const notes = JSON.parse(res.headers.get('X-Latex-Notes') || '[]');
          if (Array.isArray(notes)) setCompileNotes(notes);
        } catch { /* ignore */ }
        setCompiling(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.notes)) setCompileNotes(data.notes);

      if (res.status === 503 && data.tectonic_available === false) {
        setCompileError(
          data.message ||
          'LaTeX engine (tectonic) is not available on the server. ' +
          'Start the backend via Docker so tectonic is present.'
        );
      } else {
        setCompileError(data.log || data.message || 'Compilation failed.');
      }
      setCompiling(false);
    } catch (err) {
      setCompileError(`Could not reach the compile service: ${err.message}`);
      setCompiling(false);
    }
  };

  const editorRef = useRef(null);
  const goToLine = (line) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-[var(--color-surface-200)] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[var(--color-surface-200)] shrink-0 z-10">
        <div>
          <h2 className="text-2xl font-anton font-normal tracking-wide text-[var(--color-text-main)] flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[var(--color-primary-600)]" /> LaTeX Environment
          </h2>
          <p className="text-xs text-[var(--color-text-muted)]">Edit and compile your source code securely.</p>
        </div>
        <button
          onClick={compilePdf}
          disabled={compiling}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] disabled:opacity-50"
        >
          {compiling ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Compiling...</>
          ) : (
            <><Play className="w-4 h-4" /> Compile PDF</>
          )}
        </button>
      </div>

      <IntegrityBanner report={integrityReport} />

      <MissingFiguresPanel
        missingFigures={missingFigures}
        jobId={jobId}
        latexContent={latexContent}
        setLatexContent={setLatexContent}
        resolveFigure={resolveFigure}
      />

      <div className="flex flex-1 min-h-0">
        {/* Outline Sidebar */}
        <div className="hidden md:flex flex-col w-52 bg-[#1e1e1e] border-r border-[#333] shrink-0 text-[#ccc] overflow-hidden">
          <div className="flex items-center px-3 py-2 border-b border-[#333] shrink-0">
            <List className="h-3.5 w-3.5 mr-2" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Outline</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {outline.length === 0 ? (
              <div className="px-3 py-3 text-[10px] text-[#888] italic text-center">No sections found.</div>
            ) : outline.map((item, i) => {
              const pl = item.level === 'section' ? 'pl-3' : item.level === 'subsection' ? 'pl-6' : 'pl-9';
              const sz = item.level === 'section' ? 'text-[12px] font-medium text-white' : 'text-[11px] text-[#ccc]';
              return (
                <div key={i} className={`flex items-center py-1 cursor-pointer hover:bg-[#2a2d2e] ${pl}`} onClick={() => goToLine(item.line)}>
                  <span className={`${sz} truncate pr-2`} title={item.title}>{item.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center px-3 py-1.5 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)] shrink-0 text-xs text-[var(--color-text-muted)] font-semibold uppercase">
            MAIN.TEX
          </div>
          <div className="flex-1 min-h-0 bg-white">
            <MonacoEditor
              height="100%"
              language="latex"
              theme="vs-light"
              value={latexContent}
              onChange={(v) => setLatexContent(v || '')}
              onMount={(editor) => { editorRef.current = editor; }}
              options={{ fontSize: 14, minimap: { enabled: false }, wordWrap: 'on', lineNumbers: 'on', padding: { top: 12 }, scrollBeyondLastLine: false, smoothScrolling: true }}
            />
          </div>
        </div>

        {/* PDF Preview */}
        <div className="flex flex-col flex-1 overflow-hidden border-l border-[var(--color-surface-300)]">
          <div className="flex items-center px-3 py-1.5 border-b border-[var(--color-surface-200)] bg-[var(--color-surface-50)] shrink-0 text-xs">
            <FileDown className="h-3.5 w-3.5 mr-2 text-[var(--color-text-muted)]" />
            <span className="font-semibold text-[var(--color-text-main)]">PDF Preview</span>
          </div>
          <div className="flex-1 bg-[#525659] relative min-h-0">
            <iframe
              name="deepscan-latex-pdf-preview"
              src={pdfUrl || undefined}
              className={`w-full h-full border-none transition-opacity duration-300 ${compiling ? 'opacity-50' : 'opacity-100'}`}
              title="Compiled PDF"
            />
            {/* Empty state until first compile */}
            {!pdfUrl && !compileError && !compiling && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 pointer-events-none">
                <FileDown className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm">Click “Compile PDF” to render a preview.</p>
              </div>
            )}
            {/* Compile error log */}
            {compileError && (
              <div className="absolute inset-0 overflow-auto bg-[#1e1e1e] p-4">
                <div className="flex items-center gap-2 text-red-400 text-sm font-bold mb-2">
                  <AlertTriangle className="w-4 h-4" /> Compilation failed
                </div>
                <pre className="text-[11px] leading-relaxed text-red-200 whitespace-pre-wrap font-mono">{compileError}</pre>
              </div>
            )}
          </div>

          {/* Auto-correct notes (shown after a compile) */}
          {compileNotes.length > 0 && (
            <div className="shrink-0 px-3 py-2 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-800">
              <span className="font-semibold">Auto-corrected:</span> {compileNotes.join(' · ')}
            </div>
          )}

        </div>
      </div>

      <div className="flex justify-between px-6 py-3 bg-white border-t border-[var(--color-surface-200)] shrink-0">
        <button onClick={() => setStep(3)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--color-surface-300)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-50)]">
          <ChevronLeft className="w-4 h-4" /> Back to Process
        </button>
        <button onClick={() => setStep(5)} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)]">
          Next: Agent Editor <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Step 5 — Agent (Download + LaTeX Preview + Chat)
// ═══════════════════════════════════════════════════════════
function AgentStep() {
  const { formattedFile, latexContent, resetPipeline, setStep } = useDeepScanStore();
  const previewRef = useRef(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (!formattedFile || !previewRef.current) return;

    // Fetch the DOCX from backend and render it using docx-preview
    const fileUrl = `${PIPELINE_API}/api/v2/download/${encodeURIComponent(formattedFile)}`;
    fetch(fileUrl, { headers: authHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('File download failed');
        return res.blob();
      })
      .then(blob => {
        docx.renderAsync(blob, previewRef.current, previewRef.current, {
          className: "docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          debug: false,
        });
      })
      .catch(err => {
        console.error('Error rendering DOCX preview:', err);
        setPreviewError(true);
      });
  }, [formattedFile]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface-50)]">
      <div className="px-6 py-4 bg-white border-b border-[var(--color-surface-200)] flex items-center justify-between shrink-0 z-10">
        <div>
          <h2 className="text-3xl font-anton font-normal tracking-wide text-[var(--color-text-main)] flex items-center gap-2">
            <Bot className="w-7 h-7 text-[var(--color-primary-600)]" /> AI Document Agent
          </h2>
          <p className="text-sm font-medium text-[var(--color-text-muted)] mt-1">Review your formatted document and download the final outputs.</p>
        </div>

        {/* Actions inside header row now */}
        <div className="flex items-center gap-3">
          {formattedFile && (
            <a
              href={`${PIPELINE_API}/api/v2/download/${encodeURIComponent(formattedFile)}`}
              download
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] shadow-sm transition-transform hover:scale-105"
            >
              <Download className="w-4 h-4" /> Download DOCX
            </a>
          )}
          {latexContent && (
            <button
              onClick={() => {
                const blob = new Blob([latexContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'output.tex'; a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-surface-300)] text-[var(--color-text-main)] bg-white hover:bg-[var(--color-surface-50)] shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4" /> Download LaTeX
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative justify-center">
        {/* Real DOCX Document Preview using docx-preview */}
        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center py-8 px-4 h-full bg-[var(--color-surface-50)]">
          <style>{`
             .docx-wrapper { background: transparent !important; padding: 0 !important; display: flex; flex-direction: column; align-items: center; gap: 2rem; width: 100%; }
             .docx-wrapper > section.docx { background: white !important; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important; border-radius: 2px !important; min-height: 1056px !important; margin-bottom: 0 !important; width: 100% !important; max-width: 816px !important; border: 1px solid var(--color-surface-300) !important; padding: 60px !important; }
             /* Fix margins for overflow */
             .docx-wrapper > section.docx * { max-width: 100%; word-break: break-word; }
             .docx-wrapper > section.docx table { width: 100% !important; table-layout: fixed; }
          `}</style>

          <div className="w-full max-w-[900px] mb-8 relative flex flex-col items-center min-h-[600px] border border-transparent">
            {!previewError ? (
              <div ref={previewRef} className="w-full min-h-[500px]" />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-gray-300 bg-white shadow-xl border border-[var(--color-surface-300)] rounded-[2px] py-32 mt-4 max-w-[816px] min-h-[1056px]">
                <FileText className="w-20 h-20 opacity-20 mb-4" />
                <p className="text-xl font-medium italic">Preview Failed to Load.</p>
                <p className="text-base mt-2">Download the DOCX to see the final formatting.</p>
              </div>
            )}
          </div>

          {/* Navigation Actions below doc */}
          <div className="flex justify-center gap-4 mb-8 w-full max-w-[850px]">
            <button onClick={() => setStep(4)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-[var(--color-surface-300)] text-[var(--color-text-main)] bg-white hover:bg-[var(--color-surface-50)] shadow-sm">
              <ChevronLeft className="w-4 h-4" /> Back to LaTeX Editor
            </button>
            <button
              onClick={resetPipeline}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-[var(--color-primary-300)] text-[var(--color-primary-700)] bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)] shadow-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Format Another Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  Main DeepScan Component
// ═══════════════════════════════════════════════════════════
export function DeepScan() {
  const currentStep = useDeepScanStore((s) => s.currentStep);
  const setStep = useDeepScanStore((s) => s.setStep);
  const isProcessingDone = useDeepScanStore((s) => s.isProcessingDone);

  return (
    <div className="flex h-[calc(100vh-80px)] rounded-2xl overflow-hidden border border-[var(--color-surface-200)] shadow-lg bg-[var(--color-surface-50)]">
      <SidebarNav currentStep={currentStep} onStepClick={setStep} disabled={currentStep === 3 && !isProcessingDone} />
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-surface-50)]">
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth hide-scrollbar">
          {currentStep === 1 && <UploadStep />}
          {currentStep === 2 && <ConfigureStep />}
          {currentStep === 3 && <ProcessStep />}
          {currentStep === 4 && <LaTeXStep />}
          {currentStep === 5 && <AgentStep />}
        </div>
      </div>
    </div>
  );
}

function now() {
  return new Date().toLocaleTimeString();
}
