import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useFormsStore } from "../store/formsStore";
import Header from "../components/common/Header";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

const FormsManagement = () => {
  const { className } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { formsByClass, fetchFormsByClass, isLoading } = useFormsStore();
  const [sortedForms, setSortedForms] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Get folder ID for this class
  const getFolderId = () => {
    if (!user?.settings?.classConfigs) return null;

    const classConfig = user.settings.classConfigs.find(
      (config) => config.grade === className,
    );

    return classConfig?.folderId || null;
  };

  // Load forms when component mounts
  useEffect(() => {
    const folderId = getFolderId();
    if (folderId) {
      fetchFormsByClass(className, folderId);
    }
  }, [className, user]);

  // Sort and filter forms when the forms data changes
  useEffect(() => {
    if (formsByClass[className]?.forms) {
      const forms = [...formsByClass[className].forms];

      // Extract question numbers and sort
      forms.sort((a, b) => {
        const numA = extractQuestionNumber(a.name);
        const numB = extractQuestionNumber(b.name);
        return numA - numB;
      });

      setSortedForms(forms);
    }
  }, [formsByClass, className]);

  // Extract question number from form name
  const extractQuestionNumber = (name) => {
    const match = name.match(/Question\s+(\d+)/i);
    return match ? parseInt(match[1]) : 9999;
  };

  // Filter forms based on search term
  const filteredForms = sortedForms.filter((form) =>
    form.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Handle refresh click
  const handleRefresh = async () => {
    const folderId = getFolderId();
    if (folderId) {
      toast.promise(fetchFormsByClass(className, folderId, true), {
        loading: "Refreshing forms...",
        success: "Forms refreshed successfully",
        error: "Failed to refresh forms",
      });
    }
  };

  // Handle form click - open in new tab
  const openForm = (url) => {
    window.open(url, "_blank");
  };

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title={`${className} Forms`} />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`p-2 hover:bg-gray-700 rounded-full transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <RefreshCw size={24} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <motion.div
          className="bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-100">
                Forms for {className}
              </h2>
              {formsByClass[className]?.folderName && (
                <p className="text-gray-400 text-sm">
                  Folder: {formsByClass[className].folderName}
                </p>
              )}
            </div>

            <div className="w-full md:w-auto">
              <input
                type="text"
                placeholder="Search forms..."
                className="w-full md:w-64 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {!getFolderId() && (
            <div className="bg-yellow-800 bg-opacity-30 border border-yellow-700 text-yellow-200 p-4 rounded-lg mb-6">
              No folder ID configured for this class. Please set up a folder ID
              in the class settings.
            </div>
          )}

          {isLoading && !filteredForms.length ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
              <p className="text-gray-400">Loading forms...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchTerm
                ? "No forms matching your search"
                : "No forms found in this folder"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Form Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredForms.map((form, index) => (
                    <motion.tr
                      key={form.id || index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{form.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openForm(form.url)}
                          className="text-indigo-400 hover:text-indigo-300 p-1 rounded-full hover:bg-gray-600 flex items-center"
                          title="Open Form"
                        >
                          <ExternalLink size={18} className="mr-1" />
                          Open
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default FormsManagement;
