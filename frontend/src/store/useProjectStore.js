import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/projects';

const RECENT_KEY = 'dockling_recent_projects';

function loadRecentsFromStorage() {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveRecentsToStorage(recents) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(recents)); } catch { }
}

const useProjectStore = create((set, get) => ({
    projects: [],
    recentProjects: loadRecentsFromStorage(),
    status: 'idle', // 'idle' | 'loading' | 'error' | 'success'
    errorMessage: null,

    // Record a project visit → keep last 2, persist to localStorage
    recordVisit: (project) => {
        if (!project?._id) return;
        const slim = { _id: project._id, title: project.title, updatedAt: project.updatedAt };
        const existing = get().recentProjects.filter(p => p._id !== slim._id);
        const next = [slim, ...existing].slice(0, 2);
        saveRecentsToStorage(next);
        set({ recentProjects: next });
    },

    fetchRecentProjects: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        set({ status: 'loading', errorMessage: null });
        try {
            const res = await axios.get(`${API_URL}/recent`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ recentProjects: res.data, status: 'success' });
        } catch (error) {
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Failed to fetch recent projects' });
        }
    },

    fetchAllProjects: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        set({ status: 'loading', errorMessage: null });
        try {
            const res = await axios.get(`${API_URL}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ projects: res.data, status: 'success' });
        } catch (error) {
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Failed to fetch all projects' });
        }
    },

    createProject: async (title) => {
        const token = localStorage.getItem('token');
        if (!token) return null;

        set({ status: 'loading', errorMessage: null });
        try {
            const res = await axios.post(`${API_URL}`, { title }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistically update lists
            const newProject = res.data;
            const updatedRecents = [newProject, ...get().recentProjects.filter(p => p._id !== newProject._id)].slice(0, 2);
            saveRecentsToStorage(updatedRecents);
            set((state) => ({
                projects: [newProject, ...state.projects],
                recentProjects: updatedRecents,
                status: 'success'
            }));

            return newProject;
        } catch (error) {
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Failed to create project' });
            return null;
        }
    },

    renameProject: async (id, newTitle) => {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            await axios.put(`${API_URL}/${id}`, { title: newTitle }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistically update lists
            set((state) => ({
                projects: state.projects.map(p => p._id === id ? { ...p, title: newTitle } : p),
                recentProjects: state.recentProjects.map(p => p._id === id ? { ...p, title: newTitle } : p),
            }));

            return true;
        } catch (error) {
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Failed to rename project' });
            return false;
        }
    },

    deleteProject: async (id) => {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            await axios.delete(`${API_URL}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistically remove from lists
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
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Failed to delete project' });
            return false;
        }
    }
}));

export default useProjectStore;
