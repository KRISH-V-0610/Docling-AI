// Step 5 — Agent (DOCX preview via docx-preview + download outputs).
import { useEffect, useRef, useState } from 'react';
import { Bot, Download, FileText, ChevronLeft, RotateCcw } from 'lucide-react';
import * as docx from 'docx-preview';
import useDeepScanStore from '../../store/useDeepScanStore';
import { authHeaders } from '../../config/api';
import { deepScanService } from '../../services';

export function AgentStep() {
  const { formattedFile, latexContent, resetPipeline, setStep } = useDeepScanStore();
  const previewRef = useRef(null);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (!formattedFile || !previewRef.current) return;

    // Fetch the DOCX from backend and render it using docx-preview.
    const fileUrl = deepScanService.downloadUrl(encodeURIComponent(formattedFile));
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
              href={deepScanService.downloadUrl(encodeURIComponent(formattedFile))}
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
