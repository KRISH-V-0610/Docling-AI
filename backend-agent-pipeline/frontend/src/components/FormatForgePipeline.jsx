/**
 * FormatForge Pipeline — Main Wizard Component
 * ==============================================
 * This is the SINGLE top-level component your teammates import.
 *
 *   import { FormatForgePipeline } from './components/FormatForgePipeline';
 *   <FormatForgePipeline />
 *
 * It renders a 4-step wizard: Upload → Configure → Process → Result
 * All state is in usePipelineStore (Zustand) — no props needed.
 */
import React from "react";
import usePipelineStore from "../store/usePipelineStore";
import { UploadStep } from "./UploadStep";
import { ConfigureStep } from "./ConfigureStep";
import { ProcessStep } from "./ProcessStep";
import { ResultStep } from "./ResultStep";
import { PipelineStepBar } from "./PipelineStepBar";

const STEPS = ["Upload", "Configure", "Process", "Result"];

export function FormatForgePipeline() {
  const currentStep = usePipelineStore((s) => s.currentStep);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 font-sans">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
          FormatForge Pipeline
        </h1>
        <p className="text-gray-500 text-sm">
          Upload your manuscript, pick a style, and get a publication-ready document + LaTeX.
        </p>
      </div>

      {/* Step Progress Bar */}
      <PipelineStepBar currentStep={currentStep} steps={STEPS} />

      {/* Step Content */}
      <div className="mt-10">
        {currentStep === 1 && <UploadStep />}
        {currentStep === 2 && <ConfigureStep />}
        {currentStep === 3 && <ProcessStep />}
        {currentStep === 4 && <ResultStep />}
      </div>
    </div>
  );
}
