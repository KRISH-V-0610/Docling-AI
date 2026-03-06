import { create } from 'zustand';

const useAppStore = create((set) => ({
    // File State
    uploadedFile: null,
    setUploadedFile: (file) => set({ uploadedFile: file }),
    removeFile: () => set({ uploadedFile: null }),

    // Processing State
    currentStep: 1, // 1: Upload, 2: Analyze, 3: Configure, 4: Process
    setStep: (step) => set({ currentStep: step }),
    isProcessing: false,
    setIsProcessing: (status) => set({ isProcessing: status }),

    // Form Config State
    targetStyle: 'IEEE',
    setTargetStyle: (style) => set({ targetStyle: style }),
    customRules: '',
    setCustomRules: (rules) => set({ customRules: rules }),
    llmEngine: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    setLlmEngine: (engine) => set({ llmEngine: engine }),

    // Reconstruct context (project to write result back to)
    reconstructProjectId: null,
    setReconstructProjectId: (id) => set({ reconstructProjectId: id }),
    reconstructSourceFileName: '',
    setReconstructSourceFileName: (name) => set({ reconstructSourceFileName: name }),

    // Agent Status (Pending, Running, Done)
    agents: {
        parse: { status: 'Pending', progress: 0 },
        interpret: { status: 'Pending', progress: 0 },
        validate: { status: 'Pending', progress: 0 },
    },
    updateAgent: (agentId, data) => set((state) => ({
        agents: { ...state.agents, [agentId]: { ...state.agents[agentId], ...data } }
    })),
    startAgent: (agentId) => set((state) => ({
        agents: { ...state.agents, [agentId]: { ...state.agents[agentId], status: 'Running' } }
    })),
    finishAgent: (agentId) => set((state) => ({
        agents: { ...state.agents, [agentId]: { ...state.agents[agentId], status: 'Done', progress: 100 } }
    })),

    // Validation Results
    validationSummary: {
        headingsChecked: 0,
        citationsValidated: 0,
        errorsFound: 0,
        score: 100
    },
    setValidationSummary: (summary) => set({ validationSummary: summary }),

    // Editor Content
    originalContent: "<h1>Introduction</h1><p>This is the original manuscript text. It contains some formatting that needs to be normalized against the chosen template.</p><p>Here is a citation [1]. And another one (Smith, 2023).</p>",
    setOriginalContent: (content) => set({ originalContent: content }),

    convertedContent: "<h1>Introduction</h1><p>This is the converted manuscript text. It has been perfectly adjusted to meet IEEE formatting standards.</p><p>Here is a citation [1]. And another one [2].</p>",
    setConvertedContent: (content) => set({ convertedContent: content }),

    latexContent: "\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}",
    setLatexContent: (content) => set({ latexContent: content || "" }),

    // Logs
    processLogs: [],
    addProcessLog: (log) => set((state) => ({ processLogs: [...state.processLogs, log] })),
    clearProcessLogs: () => set({ processLogs: [] }),

    // Suggestions
    suggestions: [
        { id: 1, type: 'citation', title: 'Fix Citation Errors', description: 'Found 4 unlinked citations.', severity: 'High' },
        { id: 2, type: 'heading', title: 'Update Heading Styles', description: 'Headings do not match IEEE style.', severity: 'Medium' },
        { id: 3, type: 'table', title: 'Adjust Table Formatting', description: 'Table 1 margins are too wide.', severity: 'Low' },
    ],
    removeSuggestion: (id) => set((state) => {
        const filtered = state.suggestions.filter(s => s.id !== id);
        if (state.suggestions.length !== filtered.length) {
            return {
                suggestions: filtered,
                validationSummary: {
                    ...state.validationSummary,
                    errorsFound: Math.max(0, state.validationSummary.errorsFound - 1),
                    score: Math.min(100, state.validationSummary.score + 5)
                }
            };
        }
        return { suggestions: filtered };
    }),
}));

export default useAppStore;
