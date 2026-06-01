import { create } from 'zustand';

// Recent-projects UI state (client state — stays in Zustand, persists to
// localStorage). The SERVER project list + CRUD moved to React Query in A4
// (src/hooks/queries/useProjectQueries.js) — this store no longer fetches.

const RECENT_KEY = 'dockling_recent_projects';

function loadRecentsFromStorage() {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveRecentsToStorage(recents) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recents)); } catch { /* ignore */ }
}

const useProjectStore = create((set, get) => ({
    recentProjects: loadRecentsFromStorage(),

    // Record a project visit → keep last 2, persist to localStorage.
    recordVisit: (project) => {
        if (!project?._id) return;
        const slim = { _id: project._id, title: project.title, updatedAt: project.updatedAt };
        const existing = get().recentProjects.filter(p => p._id !== slim._id);
        const next = [slim, ...existing].slice(0, 2);
        saveRecentsToStorage(next);
        set({ recentProjects: next });
    },

    // Keep recents consistent when a project is renamed/deleted elsewhere.
    syncRecentRename: (id, title) =>
        set((state) => {
            const next = state.recentProjects.map(p => p._id === id ? { ...p, title } : p);
            saveRecentsToStorage(next);
            return { recentProjects: next };
        }),

    syncRecentDelete: (id) =>
        set((state) => {
            const next = state.recentProjects.filter(p => p._id !== id);
            saveRecentsToStorage(next);
            return { recentProjects: next };
        }),
}));

export default useProjectStore;
