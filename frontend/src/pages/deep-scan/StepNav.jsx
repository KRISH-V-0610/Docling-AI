// Step navigation widgets for the DeepScan wizard (Track A5).
import { Check } from 'lucide-react';
import { STEPS, STEP_ICONS } from './constants';

// Horizontal progress bar shown atop the Upload/Configure/Process steps.
export function StepBar({ currentStep, onStepClick, disabled }) {
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

// Vertical pipeline nav on the left of the wizard shell.
export function SidebarNav({ currentStep, onStepClick, disabled }) {
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
