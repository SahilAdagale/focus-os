import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return null
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return children
}

// Redirects already-authenticated users away from login/register pages
export function PublicRoute({ children }) {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return null
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}

export default ProtectedRoute