// Step 2 — Configure target formatting style.
import { Play, ChevronLeft, Check } from 'lucide-react';
import useDeepScanStore from '../../store/useDeepScanStore';
import { StepBar } from './StepNav';
import { STYLES } from './constants';

export function ConfigureStep() {
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
