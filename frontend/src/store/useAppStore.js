import { create } from 'zustand';

// Transient UI state shared across the app shell. The DeepScan wizard keeps its
// own isolated state in useDeepScanStore; this store now only holds what the
// remaining pages (ProjectWorkspace, ChatBot, Navbar, Sidebar) actually use.
const useAppStore = create((set) => ({
    // File State
    uploadedFile: null,
    setUploadedFile: (file) => set({ uploadedFile: file }),
    removeFile: () => set({ uploadedFile: null }),

    // Processing State (drives sidebar/navbar lockout)
    isProcessing: false,
    setIsProcessing: (status) => set({ isProcessing: status }),

    // Form Config State (target style + LLM options for formatting)
    targetStyle: 'IEEE',
    setTargetStyle: (style) => set({ targetStyle: style }),
    customRules: '',
    setCustomRules: (rules) => set({ customRules: rules }),
    llmEngine: 'openai/gpt-oss-120b',
    setLlmEngine: (engine) => set({ llmEngine: engine }),

    // Deep Scan context (project to write result back to)
    deepScanProjectId: null,
    setDeepScanProjectId: (id) => set({ deepScanProjectId: id }),
    deepScanSourceFileName: '',
    setDeepScanSourceFileName: (name) => set({ deepScanSourceFileName: name }),

    // LaTeX editor content (ProjectWorkspace)
    latexContent: "\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}",
    setLatexContent: (content) => set({ latexContent: content || "" }),

    // Chatbot Context (live document fed silently to Dockyyy)
    chatContext: '',
    setChatContext: (context) => set({ chatContext: context }),
}));

export default useAppStore;
