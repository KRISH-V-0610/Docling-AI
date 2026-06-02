/**
 * Deep Scan Tool — Standalone 5-Step Pipeline Wizard
 * ====================================================
 * Upload → Configure → Process → LaTeX → Agent
 *
 * This is a thin shell (Track A5 decomposition). Each step lives in its own file
 * under ./deep-scan/, and shared nav/constants are in ./deep-scan/StepNav +
 * constants. State is the isolated useDeepScanStore.
 */
import useDeepScanStore from '../store/useDeepScanStore';
import { PageMeta } from '../components/PageMeta';
import { SidebarNav } from './deep-scan/StepNav';
import { UploadStep } from './deep-scan/UploadStep';
import { ConfigureStep } from './deep-scan/ConfigureStep';
import { ProcessStep } from './deep-scan/ProcessStep';
import { LaTeXStep } from './deep-scan/LaTeXStep';
import { AgentStep } from './deep-scan/AgentStep';

export function DeepScan() {
  const currentStep = useDeepScanStore((s) => s.currentStep);
  const setStep = useDeepScanStore((s) => s.setStep);
  const isProcessingDone = useDeepScanStore((s) => s.isProcessingDone);

  return (
    <div className="flex h-[calc(100vh-80px)] rounded-2xl overflow-hidden border border-[var(--color-surface-200)] shadow-lg bg-[var(--color-surface-50)]">
      <PageMeta title="Deep Scan" description="AI pipeline that reformats your manuscript to a target journal style and compiles it to PDF." />
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

export default DeepScan;
