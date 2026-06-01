// Step 4 — LaTeX editor (Monaco + outline + tectonic compile + PDF preview).
import { useEffect, useState, useRef } from 'react';
import { Code2, Play, Loader2, ChevronLeft, ChevronRight, List, FileDown, AlertTriangle } from 'lucide-react';
import MonacoEditor from '@monaco-editor/react';
import useDeepScanStore from '../../store/useDeepScanStore';
import { deepScanService } from '../../services';
import { IntegrityBanner } from './IntegrityBanner';
import { MissingFiguresPanel } from './MissingFiguresPanel';

export function LaTeXStep() {
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
      const result = await deepScanService.compile(latexContent, jobId || null);
      if (result.ok) {
        const url = URL.createObjectURL(result.blob);
        setPdfUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
        if (Array.isArray(result.notes)) setCompileNotes(result.notes);
      } else {
        if (Array.isArray(result.notes)) setCompileNotes(result.notes);
        if (result.status === 503 && result.tectonicAvailable === false) {
          setCompileError(
            result.error ||
            'LaTeX engine (tectonic) is not available on the server. ' +
            'Start the backend via Docker so tectonic is present.'
          );
        } else {
          setCompileError(result.error || 'Compilation failed.');
        }
      }
    } catch (err) {
      setCompileError(`Could not reach the compile service: ${err.message}`);
    } finally {
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
