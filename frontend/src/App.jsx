import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { homeFor, useAuth } from './auth/useAuth'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/admin/Dashboard'
import { CoursesPage, FacultyPage, RoomsPage } from './pages/admin/ResourcePages'
import MyDuties from './pages/faculty/MyDuties'

function Home() {
  const { user } = useAuth()
  return <Navigate to={homeFor(user)} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route element={<ProtectedRoute role="Admin" />}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/faculty" element={<FacultyPage />} />
                <Route path="/admin/rooms" element={<RoomsPage />} />
                <Route path="/admin/courses" element={<CoursesPage />} />
              </Route>
              <Route element={<ProtectedRoute role="Faculty" />}>
                <Route path="/my-duties" element={<MyDuties />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
