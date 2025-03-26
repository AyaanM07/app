import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

const DirectoryModal = ({ classData, onClose }) => {
  const [folderId, setFolderId] = useState("");
  const [group6Code, setGroup6Code] = useState("");
  const [group4Code, setGroup4Code] = useState("");
  const [singleClassCode, setSingleClassCode] = useState("");
  const [startingQuestion, setStartingQuestion] = useState(1);
  const { user, updateSettings } = useAuthStore();

  // Check if this is grade 11 or above
  const gradeNumber = parseInt(classData.name.replace("Grade ", ""), 10);
  const isHigherGrade = gradeNumber >= 11;

  // Load existing settings when modal opens
  useEffect(() => {
    if (user?.settings?.classConfigs) {
      const config = user.settings.classConfigs.find(
        (c) => c.grade === classData.name,
      );
      if (config) {
        setFolderId(config.folderId || "");
        setStartingQuestion(config.startingQuestion || 1);

        if (isHigherGrade) {
          setGroup6Code(config.group6Code || "");
          setGroup4Code(config.group4Code || "");
        } else {
          // For lower grades, use either code available or empty string
          setSingleClassCode(config.group6Code || config.group4Code || "");
        }
      }
    }
  }, [classData, user, isHigherGrade]);

  // Handle clicking outside modal
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
      // First, check if the question number has changed and we need to update it in GAS
      const currentConfig = user?.settings?.classConfigs?.find(
        (c) => c.grade === classData.name,
      );

      const currentStartingQuestion = currentConfig?.startingQuestion || 1;
      const newStartingQuestion = parseInt(startingQuestion) || 1;

      // If starting question number has changed, send request to update it in GAS
      if (currentStartingQuestion !== newStartingQuestion) {
        // Send request to update the starting question number
        const response = await fetch("/api/questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "setStartingNumber",
            data: {
              grade: classData.name,
              number: newStartingQuestion,
            },
          }),
        });

        const result = await response.json();
        if (!result.success) {
          console.warn(
            "Failed to update starting question number in GAS:",
            result.error,
          );
          // Continue with saving settings even if GAS update failed
        }
      }

      // Get existing settings or initialize new ones
      const currentSettings = user?.settings || {
        classConfigs: [],
        globalConfig: {},
      };

      // Find and update or add new class config
      const configIndex = currentSettings.classConfigs.findIndex(
        (c) => c.grade === classData.name,
      );

      let newConfig;

      if (isHigherGrade) {
        newConfig = {
          grade: classData.name,
          folderId,
          group6Code,
          group4Code,
          startingQuestion: newStartingQuestion, // Use the new starting question
        };
      } else {
        // For lower grades, store the single code in group6Code field
        newConfig = {
          grade: classData.name,
          folderId,
          group6Code: singleClassCode,
          group4Code: "", // Empty for lower grades
          startingQuestion: newStartingQuestion, // Use the new starting question
        };
      }

      if (configIndex >= 0) {
        currentSettings.classConfigs[configIndex] = newConfig;
      } else {
        currentSettings.classConfigs.push(newConfig);
      }

      // Update settings in database
      await updateSettings(currentSettings);
      toast.success(`Settings for ${classData.name} saved successfully`);
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handlePostQuestions = async () => {
    try {
      // Create the payload
      const payload = {
        action: "postQuestions",
        data: {
          folderId: folderId,
          classroomIds: isHigherGrade
            ? [group6Code, group4Code].filter(Boolean)
            : [singleClassCode].filter(Boolean),
        },
      };

      console.log("Sending payload:", JSON.stringify(payload));

      // Show a loading toast that we can update later
      const toastId = toast.loading("Posting questions...");

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
        toast.success(result.message || "Questions posted successfully!", {
          id: toastId,
        });
        onClose();
      } else {
        throw new Error(result.error || "Failed to process request");
      }
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handlePostEmails = async () => {
    try {
      // First check if we have the required data
      if (!user?.settings?.globalConfig?.sheetsId) {
        toast.error("Please set up a Sheets ID in the global settings first");
        return;
      }

      // Get all class configs with folder IDs
      const folderIds = {};
      const startingQuestions = {}; // Add this to track starting question numbers

      if (
        user?.settings?.classConfigs &&
        user.settings.classConfigs.length > 0
      ) {
        user.settings.classConfigs.forEach((config) => {
          if (config.folderId) {
            folderIds[config.grade] = config.folderId;
            startingQuestions[config.grade] = config.startingQuestion || 1; // Store the starting question
          } else {
            folderIds[config.grade] = ""; 
            startingQuestions[config.grade] = config.startingQuestion || 1; 
          }
        });
      }

      // Make sure we have at least one valid folder ID
      const hasValidFolder = Object.values(folderIds).some((id) => id !== "");
      if (!hasValidFolder) {
        toast.error(
          "Please configure at least one folder ID in class settings",
        );
        return;
      }

      const payload = {
        action: "postEmails",
        data: {
          folderIds: folderIds,
          sheetId: user.settings.globalConfig.sheetsId,
          startingQuestions: startingQuestions, // Include starting questions
        },
      };

      console.log("Sending email payload:", JSON.stringify(payload));

      // Show a loading toast that we can update later
      const toastId = toast.loading("Sending emails...");

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
        toast.success(result.message || "Emails sent successfully!", {
          id: toastId,
        });
        
        // If the API returns updated question numbers, update them in your state
        if (result.updatedQuestions) {
          // Create a copy of the current settings to update
          const updatedSettings = JSON.parse(JSON.stringify(user.settings));
          
          // Update each class's starting question if it was changed
          for (const grade in result.updatedQuestions) {
            const classConfigIndex = updatedSettings.classConfigs.findIndex(
              config => config.grade === grade
            );
            
            if (classConfigIndex !== -1) {
              updatedSettings.classConfigs[classConfigIndex].startingQuestion = 
                result.updatedQuestions[grade];
            }
          }
          
          // Update the settings in your store
          await updateSettings(updatedSettings);
        }
        
        onClose();
      } else {
        throw new Error(result.error || "Failed to send emails");
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error(`Error: ${error.message}`);
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
        className="modal-content bg-gray-800 rounded-lg p-6 w-1/2"
        initial={{ y: -50 }}
        animate={{ y: 0 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-100">
            Configure Directory for {classData.name}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Starting question number at the top */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Starting Question Number
            </label>
            <input
              type="number"
              min="1"
              className="mt-1 block w-full bg-gray-700 text-white rounded-lg p-2"
              placeholder="Enter starting question number"
              value={startingQuestion}
              onChange={(e) => setStartingQuestion(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              This number will be used for the next question post
            </p>
          </div>

          {isHigherGrade ? (
            // For Grade 11 and above - show both inputs
            <>
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
            </>
          ) : (
            // For Grade 10 and below - show single input
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Google Classroom Code
              </label>
              <input
                type="text"
                className="mt-1 block w-full bg-gray-700 text-white rounded-lg p-2"
                placeholder="Enter code"
                value={singleClassCode}
                onChange={(e) => setSingleClassCode(e.target.value)}
              />
            </div>
          )}
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
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-400"
            onClick={handlePostQuestions}
          >
            Post Questions
          </button>
          <button
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-400"
            onClick={handlePostEmails}
          >
            Post Emails
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DirectoryModal;
