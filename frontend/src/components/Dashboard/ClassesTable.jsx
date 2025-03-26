import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Trash2, Edit2, ExternalLink, Book } from "lucide-react";
import DirectoryModal from "./DirectoryModel";
import SettingsModal from "./Settings";
import AddClassModal from "./AddClassModal";
import { useAuthStore } from "../../store/authStore";
import { useFormsStore } from "../../store/formsStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const ClassesTable = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const { user, updateSettings } = useAuthStore();
  const { formsByClass, fetchFormsByClass, getTodaysFormForClass } = useFormsStore();
  const navigate = useNavigate();

  // Load classes from user settings
  useEffect(() => {
    if (user?.settings?.classConfigs) {
      // Sort classes by grade in descending order
      const sortedClasses = [...user.settings.classConfigs]
        .sort((a, b) => {
          const gradeA = parseInt(a.grade.replace("Grade ", ""));
          const gradeB = parseInt(b.grade.replace("Grade ", ""));
          return gradeB - gradeA;
        })
        .map((config, index) => {
          // Get today's form for the class if available
          const todayForm = getTodaysFormForClass(config.grade);
          
          return {
            id: index + 1,
            name: config.grade,
            folderId: config.folderId || "",
            // Use the last posted form title if available, otherwise use today's form or default text
            email: config.lastPostedForm || (todayForm ? `${todayForm.name}` : "No form available"),
            formUrl: todayForm ? todayForm.url : null
          };
        });

      setClasses(sortedClasses);
      setFilteredClasses(sortedClasses);
      
      // Fetch forms for each class
      sortedClasses.forEach(classItem => {
        if (classItem.folderId && !formsByClass[classItem.name]) {
          fetchFormsByClass(classItem.name, classItem.folderId);
        }
      });
    } else {
      // Set default classes if none exist
      const defaultClasses = [
        { id: 1, name: "Grade 12", email: "No form available" },
        { id: 2, name: "Grade 11", email: "No form available" },
        { id: 3, name: "Grade 10", email: "No form available" },
      ];
      setClasses(defaultClasses);
      setFilteredClasses(defaultClasses);
    }
  }, [user, formsByClass]);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = classes.filter(
      (classItem) =>
        classItem.name.toLowerCase().includes(term) ||
        classItem.email.toLowerCase().includes(term),
    );
    setFilteredClasses(filtered);
  };

  const handleClassClick = (classItem) => {
    setSelectedClass(classItem);
    setIsModalOpen(true);
  };

  const handleTitleClick = () => {
    setIsSettingsModalOpen(true);
  };

  const handleAddClass = () => {
    setIsAddClassModalOpen(true);
  };

  const handleDeleteClass = async (classItem, event) => {
    // Prevent the click from bubbling up to the row's click handler
    event.stopPropagation();

    // Show delete confirmation toast
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-gray-700 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-100">
                  Delete {classItem.name}?
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-700">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                executeDelete(classItem);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-400 hover:text-red-300 focus:outline-none"
            >
              Delete
            </button>
          </div>
          <div className="flex border-l border-gray-700">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-300 focus:outline-none"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { position: "top-center", duration: 5000 },
    );
  };

  const executeDelete = async (classItem) => {
    try {
      // Get current settings
      const currentSettings = user?.settings || {
        classConfigs: [],
        globalConfig: {},
      };

      // Filter out the class to delete
      currentSettings.classConfigs = currentSettings.classConfigs.filter(
        (c) => c.grade !== classItem.name,
      );

      // Update settings in database
      await updateSettings(currentSettings);

      // Update local state to reflect the deletion
      const updatedClasses = classes.filter((c) => c.name !== classItem.name);
      setClasses(updatedClasses);
      setFilteredClasses(
        filteredClasses.filter((c) => c.name !== classItem.name),
      );

      // Show success toast
      toast.success(`${classItem.name} has been deleted successfully`);
    } catch (error) {
      console.error("Error deleting class:", error);
      toast.error(`Failed to delete ${classItem.name}. Please try again.`);
    }
  };

  // Handle view all forms for a class
  const handleViewAllForms = (classItem, event) => {
    event.stopPropagation();
    navigate(`/forms/${classItem.name}`);
  };
  
  // Handle form click - open in new tab
  const handleFormClick = (classItem, event) => {
    event.stopPropagation();
    if (classItem.formUrl) {
      window.open(classItem.formUrl, '_blank');
    }
  };

  return (
    <>
      <motion.div
        className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2
            className="text-xl font-semibold text-gray-100 cursor-pointer"
            onClick={handleTitleClick}
          >
            One Question a Day
          </h2>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search classes..."
                className="bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={handleSearch}
              />
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
            </div>
            <button
              onClick={handleAddClass}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 flex items-center"
            >
              <Plus size={18} className="mr-2" /> Add Class
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Latest Posted Form
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-700">
              {filteredClasses.map((classItem) => (
                <motion.tr
                  key={classItem.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer hover:text-blue-400"
                    onClick={() => handleClassClick(classItem)}
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                          {classItem.name.substring(6)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-100">
                          {classItem.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div 
                      className={`text-sm ${classItem.formUrl ? 'text-blue-300 cursor-pointer hover:underline' : 'text-gray-300'}`}
                      onClick={(e) => classItem.formUrl && handleFormClick(classItem, e)}
                    >
                      {classItem.email}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center space-x-3">
                      <button
                        className="text-indigo-400 hover:text-indigo-300 p-1 rounded-full hover:bg-gray-700"
                        onClick={() => handleClassClick(classItem)}
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-gray-700"
                        onClick={(e) => handleViewAllForms(classItem, e)}
                        title="View All Forms"
                      >
                        <Book size={18} />
                      </button>
                      {classItem.formUrl && (
                        <button
                          className="text-green-400 hover:text-green-300 p-1 rounded-full hover:bg-gray-700"
                          onClick={(e) => handleFormClick(classItem, e)}
                          title="Open Today's Form"
                        >
                          <ExternalLink size={18} />
                        </button>
                      )}
                      <button
                        className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-gray-700"
                        onClick={(e) => handleDeleteClass(classItem, e)}
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {isModalOpen && (
        <DirectoryModal
          classData={selectedClass}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      )}

      {isAddClassModalOpen && (
        <AddClassModal onClose={() => setIsAddClassModalOpen(false)} />
      )}
    </>
  );
};

export default ClassesTable;
