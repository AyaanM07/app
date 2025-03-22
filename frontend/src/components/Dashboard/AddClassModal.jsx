import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";

const AddClassModal = ({ onClose }) => {
  const [gradeNumber, setGradeNumber] = useState("");
  const { user, updateSettings } = useAuthStore();

  // Handle clicking outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      const modalContent = document.querySelector(".add-class-modal-content");
      if (modalContent && !modalContent.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleAddClass = async () => {
    try {
      if (!gradeNumber || isNaN(parseInt(gradeNumber))) {
        alert("Please enter a valid grade number");
        return;
      }

      // Format the grade name
      const gradeName = `Grade ${gradeNumber}`;

      // Get existing settings or initialize new ones
      const currentSettings = user?.settings || {
        classConfigs: [],
        globalConfig: {},
      };

      // Check if the grade already exists
      const exists = currentSettings.classConfigs.some(
        (config) => config.grade === gradeName,
      );

      if (exists) {
        alert(`${gradeName} already exists`);
        return;
      }

      // Add new class config
      const newConfig = {
        grade: gradeName,
        folderId: "",
        group6Code: "",
        group4Code: "",
      };

      currentSettings.classConfigs.push(newConfig);

      // Sort classes by grade in descending order
      currentSettings.classConfigs.sort((a, b) => {
        const gradeA = parseInt(a.grade.replace("Grade ", ""));
        const gradeB = parseInt(b.grade.replace("Grade ", ""));
        return gradeB - gradeA;
      });

      // Update settings in database
      await updateSettings(currentSettings);
      onClose();
    } catch (error) {
      console.error("Error adding class:", error);
      alert("Failed to add class");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="add-class-modal-content bg-gray-800 rounded-lg p-6 w-96"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
      >
        <h2 className="text-xl font-semibold text-gray-100 mb-4">
          Add New Class
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter a grade number (e.g. 9 for Grade 9)
            </label>
            <div className="flex items-center">
              <span className="bg-gray-700 text-gray-300 px-3 py-2 rounded-l-lg border-r border-gray-600">
                Grade
              </span>
              <input
                type="number"
                min="1"
                max="13"
                className="flex-grow bg-gray-700 text-white rounded-r-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={gradeNumber}
                onChange={(e) => setGradeNumber(e.target.value)}
                placeholder="Enter number (e.g. 9)"
              />
            </div>
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
            onClick={handleAddClass}
          >
            Add Class
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddClassModal;
