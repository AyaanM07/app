import { motion } from "framer-motion";
import { useEffect } from "react";

const SettingsModal = ({ onClose }) => {
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

  // Handle saving data
  const handleSave = () => {
    // Add your logic to save data here
    console.log("Settings saved!");

    // Close the modal after saving
    onClose();
  };

const saveConfig = async (config) => {
  try {
    const response = await fetch("YOUR_GAS_WEB_APP_URL", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateConfig",
        config: {
          classIdsToPost: [/* dynamic classroom codes */],
          sheetId: "YOUR_SHEET_ID",
          sheetMapping: {
            "Grade 12": { folderId: "DYNAMIC_FOLDER_ID" },
            // Add other grades
          },
          folderIdGr12: "DYNAMIC_FOLDER_ID_GR12"
        }
      }),
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    console.log("Config saved!");
  } catch (error) {
    console.error("Error saving config:", error);
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
              defaultValue="09:00"
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
            onClick={saveConfig}
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;