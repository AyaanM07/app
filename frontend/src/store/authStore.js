import axios from "axios";
import { create } from "zustand";

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api/auth`;

axios.defaults.withCredentials = true;

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  error: null,
  isLoading: false,
  isCheckingAuth: true,

  signup: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/signup`, {
        email,
        password,
        name,
      });
      // Update all related state in one batch
      set((state) => ({
        ...state,
        isAuthenticated: true,
        user: response.data.data,
        error: null,
        isLoading: false,
        isCheckingAuth: false,
      }));
    } catch (error) {
      set((state) => ({
        ...state,
        isAuthenticated: false,
        user: null,
        error: error.response?.data?.message || "Error signing up",
        isLoading: false,
        isCheckingAuth: false,
      }));
      throw error;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      if (response.data.success) {
        // Update all related state in one batch
        set((state) => ({
          ...state,
          isAuthenticated: true,
          user: response.data.data,
          error: null,
          isLoading: false,
          isCheckingAuth: false,
        }));
      }
    } catch (error) {
      set((state) => ({
        ...state,
        isAuthenticated: false,
        user: null,
        error: error.response?.data?.message || "Error logging in",
        isLoading: false,
        isCheckingAuth: false,
      }));
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_URL}/logout`);
      set({
        user: null,
        isAuthenticated: false,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      set({ error: "Error logging out", isLoading: false });
      throw error;
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/check-auth`);
      set({
        user: response.data.data,
        isAuthenticated: true,
        isCheckingAuth: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || "Error checking auth",
        isCheckingAuth: false,
        isAuthenticated: false,
      });
    }
  },

  updateSettings: async (settings) => {
    try {
      set({ isLoading: true });
      const response = await axios.put(`${API_URL}/settings`, { settings });

      if (response.data.success) {
        set((state) => ({
          ...state,
          user: {
            ...state.user,
            settings: response.data.user.settings,
          },
          isLoading: false,
        }));
        return true;
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      set({ error: "Failed to update settings", isLoading: false });
      throw error;
    }
  },
}));
