import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function ProtectedRoute() {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role !== 'user') return <Navigate to="/admin/dashboard" replace />
  return <Outlet />
}

function AdminRoute() {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  if (role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

function GuestRoute({ children }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated) return children
  return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/'} replace />
}

export { AdminRoute, GuestRoute }
export default ProtectedRoute