/**
 * Deep Scan Pipeline — Zustand Store
 * Isolated state for the 5-step wizard (Upload → Configure → Process → LaTeX → Agent).
 * Completely separate from the main useAppStore.
 */
import { create } from "zustand";

const useDeepScanStore = create((set) => ({
  // ── Step tracking (1=Upload, 2=Configure, 3=Process, 4=LaTeX, 5=Agent) ──
  currentStep: 1,
  setStep: (step) => set({ currentStep: step }),

  // ── File ──
  uploadedFile: null,
  setUploadedFile: (file) => set({ uploadedFile: file }),
  removeFile: () => set({ uploadedFile: null }),

  // ── Config ──
  targetStyle: "ieee",
  setTargetStyle: (style) => set({ targetStyle: style }),
  llmModel: "openai/gpt-oss-120b",
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

  // ── Agent documents (formatted files list from server) ──
  agentDocuments: [],
  setAgentDocuments: (docs) => set({ agentDocuments: docs }),
  addAgentDocument: (doc) =>
    set((s) => ({ agentDocuments: [...s.agentDocuments, doc] })),

  // ── Reset everything ──
  resetPipeline: () =>
    set({
      currentStep: 1,
      uploadedFile: null,
      targetStyle: "ieee",
      llmModel: "openai/gpt-oss-120b",
      processLogs: [],
      processingProgress: 0,
      currentStage: 0,
      isProcessingDone: false,
      formattedFile: null,
      complianceScore: null,
      latexContent: "",
      agentDocuments: [],
    }),
}));

export default useDeepScanStore;
