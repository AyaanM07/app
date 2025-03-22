import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, FileText, Check, Loader, Trash2 } from "lucide-react";
import Header from "../components/common/Header";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";

const P1toGoogleForms = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [folders, setFolders] = useState({
    sourceFolderId: "",
    markschemeFolderId: "",
    targetFolderId: "",
  });
  const [processingResults, setProcessingResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const { user, updateSettings } = useAuthStore();

  // Load saved folder IDs from user settings
  useEffect(() => {
    if (user?.settings?.p1ToFormsConfig) {
      const { sourceFolderId, markschemeFolderId, targetFolderId } =
        user.settings.p1ToFormsConfig;
      setFolders({
        sourceFolderId: sourceFolderId || "",
        markschemeFolderId: markschemeFolderId || "",
        targetFolderId: targetFolderId || "",
      });
    }
  }, [user]);

  // Load processing results from local storage on component mount
  useEffect(() => {
    const savedResults = localStorage.getItem("p1FormConversionResults");
    if (savedResults) {
      try {
        const parsedResults = JSON.parse(savedResults);
        setProcessingResults(parsedResults);
        setShowResults(true);
      } catch (error) {
        console.error("Error parsing saved results:", error);
        // Clear corrupted data
        localStorage.removeItem("p1FormConversionResults");
      }
    }
  }, []);

  const saveSettings = async () => {
    try {
      // Get current settings
      const currentSettings = user?.settings || {
        classConfigs: [],
        globalConfig: {},
      };

      // Update or add p1ToFormsConfig
      currentSettings.p1ToFormsConfig = {
        sourceFolderId: folders.sourceFolderId,
        markschemeFolderId: folders.markschemeFolderId,
        targetFolderId: folders.targetFolderId,
      };

      await updateSettings(currentSettings);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFolders((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleConvertPDFs = async () => {
    // Validate inputs
    if (
      !folders.sourceFolderId ||
      !folders.markschemeFolderId ||
      !folders.targetFolderId
    ) {
      toast.error("All folder IDs are required");
      return;
    }

    setIsLoading(true);
    setShowResults(false);
    setProcessingResults(null);

    try {
      const toastId = toast.loading("Converting PDFs to Google Forms...");

      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "convertPDFsToForms",
          data: {
            sourceFolderId: folders.sourceFolderId,
            markschemeFolderId: folders.markschemeFolderId,
            targetFolderId: folders.targetFolderId,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("PDFs converted successfully!", { id: toastId });
        setProcessingResults(result);
        setShowResults(true);

        // Save results to localStorage
        localStorage.setItem("p1FormConversionResults", JSON.stringify(result));

        // Save settings after successful conversion
        await saveSettings();
      } else {
        throw new Error(result.error || "Failed to convert PDFs");
      }
    } catch (error) {
      console.error("Error converting PDFs:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResults = () => {
    setProcessingResults(null);
    setShowResults(false);
    localStorage.removeItem("p1FormConversionResults");
    toast.success("Results cleared");
  };

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Paper 1 to Google Forms" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-gray-100 mb-4">
            Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source Folder ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Folder ID (MCQ Papers)
              </label>
              <input
                type="text"
                name="sourceFolderId"
                value={folders.sourceFolderId}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Google Drive folder ID"
              />
              <p className="text-xs text-gray-400 mt-1">
                Folder containing PDF question papers
              </p>
            </div>

            {/* Markscheme Folder ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Markscheme Folder ID
              </label>
              <input
                type="text"
                name="markschemeFolderId"
                value={folders.markschemeFolderId}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Google Drive folder ID"
              />
              <p className="text-xs text-gray-400 mt-1">
                Folder containing PDF markschemes
              </p>
            </div>

            {/* Target Folder ID */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Folder ID
              </label>
              <input
                type="text"
                name="targetFolderId"
                value={folders.targetFolderId}
                onChange={handleInputChange}
                className="w-full bg-gray-700 text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Google Drive folder ID"
              />
              <p className="text-xs text-gray-400 mt-1">
                Folder where Google Forms will be saved
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-8 space-x-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-400"
              onClick={saveSettings}
            >
              Save Settings
            </button>
            <button
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              onClick={handleConvertPDFs}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin mr-2" size={18} />
                  Processing...
                </>
              ) : (
                <>Convert PDFs to Forms</>
              )}
            </button>
          </div>
        </motion.div>

        {/* Instructions Panel */}
        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-start">
            <AlertCircle
              className="text-yellow-400 mr-4 mt-1 flex-shrink-0"
              size={24}
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                Important Instructions
              </h3>
              <ul className="list-disc pl-5 text-gray-300 space-y-2">
                <li>
                  Ensure the source folder contains only the MCQ PDF papers you
                  want to process
                </li>
                <li>
                  Markscheme PDFs should have the same file names as their
                  corresponding question papers
                </li>
                <li>
                  The conversion might take a few minutes depending on the
                  number of PDFs
                </li>
                <li>
                  <strong>Note:</strong> Questions with complex content like
                  tables, graphs, or images may need manual editing after
                  conversion
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Results Panel */}
        {showResults && processingResults && (
          <motion.div
            className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-100 flex items-center">
                <Check className="text-green-500 mr-2" size={24} />
                Processing Results
              </h2>
              <button
                onClick={handleClearResults}
                className="flex items-center text-red-400 hover:text-red-300 px-3 py-1 rounded-md hover:bg-gray-700 transition-colors"
                title="Clear Results"
              >
                <Trash2 size={18} className="mr-1" />
                <span>Clear Results</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                <h3 className="text-md font-medium text-gray-300 mb-2">
                  Summary
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-400">Files Processed:</span>
                    <span className="text-white font-semibold">
                      {processingResults.processedFiles || 0}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-400">Forms Created:</span>
                    <span className="text-green-500 font-semibold">
                      {processingResults.formsCreated || 0}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-400">Errors:</span>
                    <span className="text-red-500 font-semibold">
                      {processingResults.errorCount || 0}
                    </span>
                  </li>
                </ul>
              </div>

              {processingResults.forms &&
                processingResults.forms.length > 0 && (
                  <div className="bg-gray-700 bg-opacity-50 rounded-lg p-4">
                    <h3 className="text-md font-medium text-gray-300 mb-2">
                      Created Forms ({processingResults.forms.length})
                    </h3>
                    <div className="max-h-64 overflow-y-auto">
                      <ul className="space-y-2">
                        {processingResults.forms.map((form, index) => (
                          <li key={index} className="flex items-center">
                            <FileText
                              className="text-blue-400 mr-2"
                              size={16}
                            />
                            <a
                              href={form.editUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline text-sm truncate"
                            >
                              {form.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default P1toGoogleForms;
