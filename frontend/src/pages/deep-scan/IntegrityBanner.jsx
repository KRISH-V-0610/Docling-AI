// Content-integrity banner (Phase C — no-data-loss check) shown in the LaTeX step.
import { Check, AlertTriangle } from 'lucide-react';

export function IntegrityBanner({ report }) {
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
