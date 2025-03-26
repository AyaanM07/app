import axios from "axios";
import { create } from "zustand";

const API_URL = `${import.meta.env.VITE_BACKEND_URL}/api/auth`;

axios.defaults.withCredentials = true;

// add interceptor to handle 401s
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // clear auth state on 401
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  },
);

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  error: null,
  isLoading: false,
  isCheckingAuth: true,

  clearAuth: () => {
    set({
      user: null,
      isAuthenticated: false,
      error: null,
      isLoading: false,
      isCheckingAuth: false,
    });
  },

  signup: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/signup`, {
        email,
        password,
        name,
      });
      set({
        isAuthenticated: true,
        user: response.data.data,
        error: null,
        isLoading: false,
        isCheckingAuth: false,
      });
    } catch (error) {
      set({
        isAuthenticated: false,
        user: null,
        error: error.response?.data?.message || "Error signing up",
        isLoading: false,
        isCheckingAuth: false,
      });
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
        set({
          isAuthenticated: true,
          user: response.data.data,
          error: null,
          isLoading: false,
          isCheckingAuth: false,
        });
      }
    } catch (error) {
      set({
        isAuthenticated: false,
        user: null,
        error: error.response?.data?.message || "Error logging in",
        isLoading: false,
        isCheckingAuth: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_URL}/logout`);
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // always clear auth state regardless of logout API success
      set({
        user: null,
        isAuthenticated: false,
        error: null,
        isLoading: false,
        isCheckingAuth: false,
      });
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
        error: null,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        error: error.response?.data?.message || "Error checking auth",
        isCheckingAuth: false,
      });
    }
  },

  updateSettings: async (settings) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.put(`${API_URL}/settings`, { settings });

      if (response.data.success) {
        set((state) => ({
          ...state,
          user: {
            ...state.user,
            settings: response.data.user.settings,
          },
          isLoading: false,
          error: null,
        }));
        return true;
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      set({
        error: "Failed to update settings",
        isLoading: false,
      });
      throw error;
    }
  },
}));
