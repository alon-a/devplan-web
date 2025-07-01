import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import DialoguesPage from './pages/DialoguesPage'
import VideosPage from './pages/VideosPage'
import TemplatesPage from './pages/TemplatesPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="dialogues" element={<DialoguesPage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="templates" element={<TemplatesPage />} />
          </Route>
        </Route>
      </Routes>
    </div>
  )
}

export default App 