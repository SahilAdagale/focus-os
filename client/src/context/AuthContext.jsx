import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Sync token to localStorage whenever it changes
        if (token) {
            localStorage.setItem('token', token)
        } else {
            localStorage.removeItem('token')
        }
        setLoading(false)
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
