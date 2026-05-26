import { create } from 'zustand';
import axios from 'axios';
import { ENDPOINTS } from '../config/api';

const API_URL = ENDPOINTS.auth;

const useAuthStore = create((set, get) => ({
    user: null,
    isAuthenticated: false,
    status: 'idle', // 'idle' | 'loading' | 'error' | 'success'
    errorMessage: null,

    // Initialize state from local storage token
    checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            set({ isAuthenticated: false, user: null, status: 'idle' });
            return;
        }

        set({ status: 'loading', errorMessage: null });
        try {
            const res = await axios.get(`${API_URL}/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            set({ user: res.data, isAuthenticated: true, status: 'success' });
        } catch (error) {
            localStorage.removeItem('token');
            set({ user: null, isAuthenticated: false, status: 'error', errorMessage: error.response?.data?.error || 'Session expired' });
        }
    },

    login: async (email, password) => {
        set({ status: 'loading', errorMessage: null });
        try {
            const res = await axios.post(`${API_URL}/login`, { email, password });
            localStorage.setItem('token', res.data.token);
            set({ user: res.data, isAuthenticated: true, status: 'success' });
            return true;
        } catch (error) {
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Login failed' });
            return false;
        }
    },

    signup: async (username, email, password) => {
        set({ status: 'loading', errorMessage: null });
        try {
            const res = await axios.post(`${API_URL}/signup`, { username, email, password });
            localStorage.setItem('token', res.data.token);
            set({ user: res.data, isAuthenticated: true, status: 'success' });
            return true;
        } catch (error) {
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Signup failed' });
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false, status: 'idle' });
    },

    updateProfilePic: async (file) => {
        const token = localStorage.getItem('token');
        if (!token) return false;

        set({ status: 'loading', errorMessage: null });
        try {
            const formData = new FormData();
            formData.append('profileImage', file);

            const res = await axios.put(`${API_URL}/profile/picture`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            // Update the user state with new profile picture
            set({ user: res.data, status: 'success' });
            return true;
        } catch (error) {
            set({ status: 'error', errorMessage: error.response?.data?.error || 'Failed to update profile picture' });
            return false;
        }
    },

    clearError: () => set({ errorMessage: null, status: 'idle' })
}));

export default useAuthStore;
