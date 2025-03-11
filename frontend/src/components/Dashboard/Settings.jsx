import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import axios from "axios";
import DatePicker from "react-datepicker"; 
import "react-datepicker/dist/react-datepicker.css";

const SettingsModal = ({ onClose }) => {
  const [postingTime, setPostingTime] = useState("09:00");
  const [sheetsId, setSheetsId] = useState("");
  const [skipDates, setSkipDates] = useState([]);
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Convert local time to UTC
  const convertToUTC = (localTime) => {
    const [hours, minutes] = localTime.split(":");
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  };

  // Convert UTC to local time
  const convertToLocal = (utcTime) => {
    const [hours, minutes] = utcTime.split(":");
    const date = new Date();
    date.setUTCHours(parseInt(hours));
    date.setUTCMinutes(parseInt(minutes));
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  // Load existing settings when modal opens
  useEffect(() => {
    if (user?.settings?.globalConfig) {
      const { postingTime, sheetsId, skipDates } = user.settings.globalConfig;
      setPostingTime(postingTime ? convertToLocal(postingTime) : "09:00");
      setSheetsId(sheetsId || "");
      setSkipDates(skipDates ? skipDates.map(date => new Date(date)) : []);
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

  const handleDateSelect = (date) => {
    const dateExists = skipDates.some(
      skipDate => 
        skipDate.toDateString() === date.toDateString()
    );
    
    if (dateExists) {
      setSkipDates(skipDates.filter(
        skipDate => skipDate.toDateString() !== date.toDateString()
      ));
    } else {
      setSkipDates([...skipDates, date]);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      const currentSettings = user?.settings || {
        classConfigs: [],
        globalConfig: {},
      };

      currentSettings.globalConfig = {
        postingTime: convertToUTC(postingTime),
        sheetsId,
        skipDates
      };

      await axios.put("/api/auth/settings", {
        settings: currentSettings,
      });

      setSuccess("Settings updated successfully");
      onClose();
    } catch (error) {
      setError(error.message || "An error occurred");
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setIsLoading(false);
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
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Change Time (Your Local Time)
            </label>
            <input
              type="time"
              className="mt-1 block w-full bg-gray-700 text-white rounded-lg p-2"
              value={postingTime}
              onChange={(e) => setPostingTime(e.target.value)}
            />
          </div>

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

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Skip Dates (No questions will be posted on selected dates)
            </label>
            <div className="calendar-container">
              <DatePicker
                inline
                selected={null}
                onChange={handleDateSelect}
                highlightDates={skipDates}
                minDate={new Date()}
                className="skip-dates-calendar"
              />
            </div>
            <div className="selected-dates mt-3">
              <h5>Selected Skip Dates:</h5>
              {skipDates.length === 0 ? (
                <p>No dates selected</p>
              ) : (
                <ul className="skip-dates-list">
                  {skipDates.sort((a, b) => a - b).map((date, idx) => (
                    <li key={idx}>
                      {date.toLocaleDateString()}
                      <button 
                        type="button" 
                        onClick={() => handleDateSelect(date)} 
                        className="btn-sm btn-danger ml-2"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

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
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;
