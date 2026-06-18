import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

/**
 * Requires authentication and Admin role (JWT / demo token).
 * Registered members promoted under Admin → Members receive role Admin on next login.
 */
function AdminProtectedRoute() {
  const { isAuthenticated, role } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  const r = (role ?? '').toLowerCase()
  if (r === 'admin') {
    return <Outlet />
  }

  if (r === 'student') {
    return <Navigate to="/student/applications" replace />
  }

  return <Navigate to="/dashboard" replace />
}

export default AdminProtectedRoute
