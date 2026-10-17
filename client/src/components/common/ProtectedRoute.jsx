import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import Loader from './Loader.jsx'

export default function ProtectedRoute({ children }) {
  const { status, user } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <Loader label="Checking your session…" className="min-h-screen" />
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}
