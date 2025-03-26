import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Header from '../components/common/Header';
import { ChevronRight } from 'lucide-react';

const FormsManagementDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (user?.settings?.classConfigs) {
      const sortedClasses = [...user.settings.classConfigs]
        .sort((a, b) => {
          const gradeA = parseInt(a.grade.replace("Grade ", ""));
          const gradeB = parseInt(b.grade.replace("Grade ", ""));
          return gradeB - gradeA;
        });
      
      setClasses(sortedClasses);
    }
  }, [user]);

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Forms Management" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <motion.div
          className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-semibold text-gray-100 mb-6">
            Select a Class to Manage Forms
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classConfig) => (
              <motion.div
                key={classConfig.grade}
                className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => navigate(`/forms/${classConfig.grade}`)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-100">
                      {classConfig.grade}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {classConfig.folderId 
                        ? "Folder ID configured" 
                        : "No folder ID configured"}
                    </p>
                  </div>
                  <ChevronRight className="text-gray-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default FormsManagementDashboard;