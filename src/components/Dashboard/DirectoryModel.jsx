import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const DirectoryModal = ({ classData, onClose }) => {
  const [folderId, setFolderId] = useState("");
  const [group6Code, setGroup6Code] = useState("");
  const [group4Code, setGroup4Code] = useState("");

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

  // Save configuration
  const handlePostQuestions = async () => {
    console.log("Sending request with:", { folderId, group6Code, group4Code });
    try {
      // Create the payload
      const payload = {
        action: "postQuestions",
        data: {
          folderId: folderId,
          classroomIds: [group6Code, group4Code].filter(Boolean), // filter out empty codes
        },
      };

      console.log("Sending payload:", JSON.stringify(payload));

      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Response from server:", result);

      if (result.success) {
        alert(result.message || "Request sent successfully!");
        onClose();
      } else {
        throw new Error(result.error || "Failed to process request");
      }
    } catch (error) {
      console.error("Error sending request:", error);
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
          Configure Directory for {classData.name}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Google Classroom Code (Group 6)
            </label>
            <input
              type="text"
              className="mt-1 block w-full bg-gray-700 text-white rounded-lg p-2"
              placeholder="Enter code"
              value={group6Code}
              onChange={(e) => setGroup6Code(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Google Classroom Code (Group 4)
            </label>
            <input
              type="text"
              className="mt-1 block w-full bg-gray-700 text-white rounded-lg p-2"
              placeholder="Enter code"
              value={group4Code}
              onChange={(e) => setGroup4Code(e.target.value)}
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
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
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
            onClick={handlePostQuestions} // Call saveConfig here
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DirectoryModal;