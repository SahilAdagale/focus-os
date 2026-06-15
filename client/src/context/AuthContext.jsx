import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    // localStorage.getItem is synchronous — auth state is known immediately,
    // so loading starts as false (no async check needed).
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Sync token changes back to localStorage
        if (token) {
            localStorage.setItem('token', token)
        } else {
            localStorage.removeItem('token')
        }
    }, [token])

    const loginAuth = (newToken, userData) => {
        setToken(newToken)
        setUser(userData)
    }

    const logout = () => {
        setToken(null)
        setUser(null)
    }

    const value = {
        token,
        user,
        loading,
        isAuthenticated: !!token,
        loginAuth,
        logout
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
