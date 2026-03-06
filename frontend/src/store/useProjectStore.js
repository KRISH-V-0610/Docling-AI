import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/projects';

const useProjectStore = create((set, get) => ({
    projects: [],
    recentProjects: [],
    status: 'idle', // 'idle' | 'loading' | 'error' | 'success'
    errorMessage: null,

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
            set((state) => ({
                projects: [newProject, ...state.projects],
                recentProjects: [newProject, ...state.recentProjects.slice(0, 1)], // Keep max 2
                status: 'success'
            }));

            return newProject;
        } catch (error) {
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Failed to create project' });
            return null;
        }
    }
}));

export default useProjectStore;
