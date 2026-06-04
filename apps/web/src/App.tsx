import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import ProjectDetail from '@/pages/ProjectDetail'
import JoinProject from '@/pages/JoinProject'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, user } = useAuthStore()
  if (!accessToken || !user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/join/:id" element={<JoinProject />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
