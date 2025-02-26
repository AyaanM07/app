import { Navigate, Route, Routes } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import P1toGoogleForms from "./pages/P1toGoogleForms"
import  Sidebar  from "./components/Sidebar"
import FloatingShape from "./components/FloatingShapes"
import SignUpPage from "./pages/SignUpPage"
import LoginPage from "./pages/LoginPage"
import EmailVerificationPage from "./pages/EmailVerificationPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import { Toaster } from "react-hot-toast"
import { useAuthStore } from "./store/authStore"
import { useEffect } from "react"
import LoadingSpinner from "./components/AuthPage/LoadingSpinner"
import ResetPasswordPage from "./pages/ResetPasswordPage"

//protect route that require authentication
const ProtectedRoute = ({children}) => {
  const {isAuthenticated, user} = useAuthStore();

  if(!isAuthenticated){
    return <Navigate to='/login' replace />
  }

  if(!user?.isVerified){
    return <Navigate to='/verify-email' replace />
  }

  return children;
}

//redirect authenticated user to dashboard
const RedirectAuthenticatedUser = ({children}) => {
  const {isAuthenticated, user} = useAuthStore();

  if(isAuthenticated && user?.isVerified){
    return <Navigate to='/' replace />
  }

  return children
}

function App() {
  const {isCheckingAuth, checkAuth} = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if(isCheckingAuth) return <LoadingSpinner/>

  return (
    <div className='flex h-screen bg-gray-900 text-gray-100 overflow-hidden'>

      {/* BG */}
      <div className='fixed inset-0 z-0' >
        <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80' />
        <div className='absolute inset-0 backdrop-blur-sm'/>

        <FloatingShape color='bg-blue-500' size='w-64 h-64' top= '5%' left= '10%' delay={0}/>
        <FloatingShape color='bg-emrald-500' size='w-48 h-48' top= '70%' left= '80%' delay={5}/>
        <FloatingShape color='bg-teal-500' size='w-32 h-32' top= '40%' left= '-10%' delay={2}/>
      </div>

      <Sidebar />
      <Routes>
        <Route path='/' element={<ProtectedRoute>
          <Dashboard/>
        </ProtectedRoute>} />
        <Route path='/signup' element={<RedirectAuthenticatedUser>
          <SignUpPage />
        </RedirectAuthenticatedUser>} />
        <Route path='/login' element={<RedirectAuthenticatedUser>
          <LoginPage />
        </RedirectAuthenticatedUser>} />
        <Route path='/verify-email' element={<EmailVerificationPage />} />
        <Route path='/forgot-password' element={<RedirectAuthenticatedUser>
          <ForgotPasswordPage/>
        </RedirectAuthenticatedUser>} />
        <Route path='/reset-password/:token' element={<RedirectAuthenticatedUser>
          <ResetPasswordPage/>
        </RedirectAuthenticatedUser>} />
        <Route path='/P1togoogleforms' element={<P1toGoogleForms />} /> 
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
