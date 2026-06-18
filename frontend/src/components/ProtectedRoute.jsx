import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  return children
}

export default ProtectedRoute
