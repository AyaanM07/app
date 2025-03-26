import { create } from "zustand";
import axios from "axios";

export const useFormsStore = create((set, get) => ({
  formsByClass: {}, // Object with class names as keys and forms array as values
  isLoading: false,
  error: null,

  // Fetch forms for a specific class using the folder ID
  fetchFormsByClass: async (className, folderId, refresh = false) => {
    if (!folderId) return;

    try {
      set({ isLoading: true, error: null });

      console.log(
        `Fetching forms for class ${className} with folder ID ${folderId}`,
      );

      // Use the new endpoint with refresh parameter
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/questions/forms-extract`,
        {
          params: {
            folderId,
            refresh,
          },
        },
      );

      const data = response.data;
      console.log("Forms data received:", data);

      // Update the store with the fetched forms for this class
      set((state) => ({
        formsByClass: {
          ...state.formsByClass,
          [className]: data,
        },
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error fetching forms:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Status:", error.response.status);
      }

      set({
        error: error.message || "Failed to fetch forms",
        isLoading: false,
      });
    }
  },

  // Get today's form for a specific class
  getTodaysFormForClass: (className) => {
    const classData = get().formsByClass[className];
    if (!classData || !classData.forms || classData.forms.length === 0) {
      return null;
    }

    // Get the form based on the current date (simplified implementation)
    // This could be enhanced to be more sophisticated based on your needs
    const today = new Date();
    const dayOfYear = Math.floor(
      (today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24),
    );
    const formIndex = dayOfYear % classData.forms.length;

    return classData.forms[formIndex];
  },
}));
