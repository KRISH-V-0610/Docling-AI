/**
 * FormatForge Pipeline — Zustand Store
 * Centralised state for the pipeline wizard (Upload → Configure → Process → Done).
 * Drop this file in, import it, and you're ready to go.
 */
import { create } from "zustand";

const usePipelineStore = create((set) => ({
  // ── Step tracking (1=Upload, 2=Configure, 3=Process, 4=Done) ──
  currentStep: 1,
  setStep: (step) => set({ currentStep: step }),

  // ── File ──
  uploadedFile: null,
  setUploadedFile: (file) => set({ uploadedFile: file }),
  removeFile: () => set({ uploadedFile: null }),

  // ── Config ──
  targetStyle: "apa7",
  setTargetStyle: (style) => set({ targetStyle: style }),
  llmModel: "meta-llama/llama-4-maverick-17b-128e-instruct",
  setLlmModel: (model) => set({ llmModel: model }),

  // ── Processing results ──
  processLogs: [],
  addProcessLog: (log) =>
    set((s) => ({ processLogs: [...s.processLogs, log] })),
  clearProcessLogs: () => set({ processLogs: [] }),

  processingProgress: 0,
  setProcessingProgress: (p) => set({ processingProgress: p }),

  currentStage: 0,
  setCurrentStage: (s) => set({ currentStage: s }),

  isProcessingDone: false,
  setIsProcessingDone: (v) => set({ isProcessingDone: v }),

  formattedFile: null,
  setFormattedFile: (f) => set({ formattedFile: f }),

  complianceScore: null,
  setComplianceScore: (s) => set({ complianceScore: s }),

  latexContent: "",
  setLatexContent: (c) => set({ latexContent: c || "" }),

  // ── Reset everything ──
  resetPipeline: () =>
    set({
      currentStep: 1,
      uploadedFile: null,
      targetStyle: "apa7",
      llmModel: "meta-llama/llama-4-maverick-17b-128e-instruct",
      processLogs: [],
      processingProgress: 0,
      currentStage: 0,
      isProcessingDone: false,
      formattedFile: null,
      complianceScore: null,
      latexContent: "",
    }),
}));

export default usePipelineStore;
