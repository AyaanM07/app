import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import axios from "axios";

const SettingsModal = ({ onClose }) => {
  const [postingTime, setPostingTime] = useState("09:00");
  const [startingQuestion, setStartingQuestion] = useState("");
  const [sheetsId, setSheetsId] = useState("");
  const { user } = useAuthStore();

  // Load existing settings when modal opens
  useEffect(() => {
    if (user?.settings?.globalConfig) {
      const { postingTime, startingQuestion, sheetsId } =
        user.settings.globalConfig;
      setPostingTime(postingTime || "09:00");
      setStartingQuestion(startingQuestion || "");
      setSheetsId(sheetsId || "");
    }
  }, [user]);

  // Handle clicking outside the modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      const modalContent = document.querySelector(".modal-content");
      if (modalContent && !modalContent.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSave = async () => {
    try {
      const currentSettings = user?.settings || {
        classConfigs: [],
        globalConfig: {},
      };

      currentSettings.globalConfig = {
        postingTime,
        startingQuestion: Number(startingQuestion),
        sheetsId,
      };

      await axios.put("/api/auth/settings", {
        settings: currentSettings,
      });

      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    }
  };

  const handleTimeChange = async (newTime) => {
    try {
      const payload = {
        action: "updatePostingTime",
        data: {
          postingTime: newTime,
        },
      };

      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert("Posting time updated successfully!");
      } else {
        throw new Error(result.error || "Failed to update posting time");
      }
    } catch (error) {
      console.error("Error updating posting time:", error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="modal-content bg-gray-800 rounded-lg p-6 w-1/2"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
      >
        <h2 className="text-xl font-semibold text-gray-100 mb-4">
          One Question a Day Settings
        </h2>

        <div className="space-y-4">
          {/* Change Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Change Time
            </label>
            <input
              type="time"
              className="mt-1 block w-full bg-gray-700 text-white rounded-lg p-2"
              value={postingTime}
              onChange={(e) => {
                setPostingTime(e.target.value);
                handleTimeChange(e.target.value);
              }}
            />
          </div>

          {/* Change Starting Question */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Change Starting Question
            </label>
            <input
              type="number"
              className="mt-1 block w-full bg-gray-700 text-white rounded-lg p-2"
              placeholder="Enter starting question number"
              value={startingQuestion}
              onChange={(e) => setStartingQuestion(e.target.value)}
            />
          </div>

          {/* Folder Directory (Google Sheets ID) */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Folder ID
            </label>
            <input
              type="text"
              className="mt-1 block w-full bg-gray-700 text-white rounded-lg p-2"
              placeholder="Enter Folder ID"
              value={sheetsId}
              onChange={(e) => setSheetsId(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;
