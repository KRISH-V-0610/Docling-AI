// Phase I — prompt the user to upload an image for each figure the pipeline
// detected but couldn't extract (e.g. EMF/WMF vector charts). On upload the
// backend fills the placeholder slot in the LaTeX and returns the updated source.
import { useState } from 'react';
import { AlertTriangle, Upload, Loader2 } from 'lucide-react';
import { deepScanService } from '../../services';

export function MissingFiguresPanel({ missingFigures, jobId, latexContent, setLatexContent, resolveFigure }) {
  const [busyN, setBusyN] = useState(null);
  const [error, setError] = useState(null);
  if (!missingFigures || missingFigures.length === 0) return null;

  const upload = async (fig, fileEl) => {
    const f = fileEl?.files?.[0];
    if (!f) return;
    setBusyN(fig.n);
    setError(null);
    try {
      const data = await deepScanService.uploadFigure(jobId, fig.n, f, latexContent || '');
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
