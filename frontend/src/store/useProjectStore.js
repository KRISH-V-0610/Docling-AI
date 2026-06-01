import { create } from 'zustand';
import { projectService } from '../services';

// Project list/recents state. Network I/O goes through projectService; the
// optimistic update pattern is preserved (UI updates before/after the call).
// NOTE: server-state caching moves to React Query in Phase A4 — this store stays
// for now so call sites keep working through the migration.

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
    projects: [],
    recentProjects: loadRecentsFromStorage(),
    status: 'idle', // 'idle' | 'loading' | 'error' | 'success'
    errorMessage: null,

    // Record a project visit → keep last 2, persist to localStorage.
    recordVisit: (project) => {
        if (!project?._id) return;
        const slim = { _id: project._id, title: project.title, updatedAt: project.updatedAt };
        const existing = get().recentProjects.filter(p => p._id !== slim._id);
        const next = [slim, ...existing].slice(0, 2);
        saveRecentsToStorage(next);
        set({ recentProjects: next });
    },

    fetchRecentProjects: async () => {
        if (!localStorage.getItem('token')) return;
        set({ status: 'loading', errorMessage: null });
        try {
            const recents = await projectService.listRecent();
            set({ recentProjects: recents, status: 'success' });
        } catch (error) {
            set({ status: 'error', errorMessage: error.message });
        }
    },

    fetchAllProjects: async () => {
        if (!localStorage.getItem('token')) return;
        set({ status: 'loading', errorMessage: null });
        try {
            const projects = await projectService.list();
            set({ projects, status: 'success' });
        } catch (error) {
            set({ status: 'error', errorMessage: error.message });
        }
    },

    createProject: async (title) => {
        if (!localStorage.getItem('token')) return null;
        set({ status: 'loading', errorMessage: null });
        try {
            const newProject = await projectService.create(title);
            const updatedRecents = [newProject, ...get().recentProjects.filter(p => p._id !== newProject._id)].slice(0, 2);
            saveRecentsToStorage(updatedRecents);
            set((state) => ({
                projects: [newProject, ...state.projects],
                recentProjects: updatedRecents,
                status: 'success'
            }));
            return newProject;
        } catch (error) {
            set({ status: 'error', errorMessage: error.message });
            return null;
        }
    },

    renameProject: async (id, newTitle) => {
        if (!localStorage.getItem('token')) return false;
        try {
            await projectService.update(id, { title: newTitle });
            set((state) => ({
                projects: state.projects.map(p => p._id === id ? { ...p, title: newTitle } : p),
                recentProjects: state.recentProjects.map(p => p._id === id ? { ...p, title: newTitle } : p),
            }));
            return true;
        } catch (error) {
            set({ status: 'error', errorMessage: error.message });
            return false;
        }
    },

    deleteProject: async (id) => {
        if (!localStorage.getItem('token')) return false;
        try {
            await projectService.remove(id);
            set((state) => ({
                projects: state.projects.filter(p => p._id !== id),
                recentProjects: (() => {
                    const next = state.recentProjects.filter(p => p._id !== id);
                    saveRecentsToStorage(next);
                    return next;
                })(),
            }));
            return true;
        } catch (error) {
            set({ status: 'error', errorMessage: error.message });
            return false;
        }
    }
}));

export default useProjectStore;
