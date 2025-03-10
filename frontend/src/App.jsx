import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import P1toGoogleForms from "./pages/P1toGoogleForms";
import TestBuilder from "./pages/TestBuilder";
import Sidebar from "./components/Sidebar";
import FloatingShape from "./components/FloatingShapes";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { useEffect } from "react";
import LoadingSpinner from "./components/AuthPage/LoadingSpinner";

// Protect routes that require authentication
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Redirect authenticated users to the dashboard
const RedirectAuthenticatedUser = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { isCheckingAuth, checkAuth } = useAuthStore();
  const location = useLocation(); // Get the current route location

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <LoadingSpinner />;

  // Define routes where the sidebar should be shown
  const showSidebarRoutes = ["/", "/P1togoogleforms"];

  // Check if the current route should show the sidebar
  const shouldShowSidebar = showSidebarRoutes.includes(location.pathname);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
        <div className="absolute inset-0 backdrop-blur-sm" />

        <FloatingShape
          color="bg-blue-500"
          size="w-64 h-64"
          top="5%"
          left="10%"
          delay={0}
        />
        <FloatingShape
          color="bg-emerald-500"
          size="w-48 h-48"
          top="70%"
          left="80%"
          delay={5}
        />
        <FloatingShape
          color="bg-teal-500"
          size="w-32 h-32"
          top="40%"
          left="-10%"
          delay={2}
        />
      </div>

      {/* Conditionally render the Sidebar */}
      {shouldShowSidebar && <Sidebar />}

      {/* Routes */}
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectAuthenticatedUser>
              <SignUpPage />
            </RedirectAuthenticatedUser>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectAuthenticatedUser>
              <LoginPage />
            </RedirectAuthenticatedUser>
          }
        />
        <Route path="/P1togoogleforms" element={<P1toGoogleForms />} />
        
        <Route
          path="/test-builder"
          element={
            <ProtectedRoute>
              <TestBuilder />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Toaster />
    </div>
  );
}

export default App;
