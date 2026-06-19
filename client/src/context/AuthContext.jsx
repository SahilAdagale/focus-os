import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe } from '../services/userService'

const AuthContext = createContext(null)

const DEFAULT_SETTINGS = {
    defaultDuration: 25,
    dailyGoal: 120,
    soundEnabled: true,
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [user, setUser] = useState(null)
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)
    // loading stays true until we've fetched the user profile (or confirmed no token)
    const [loading, setLoading] = useState(!!localStorage.getItem('token'))

    // Sync token to localStorage on change
    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token)
        } else {
            localStorage.removeItem('token')
        }
    }, [token])

    // Fetch user profile + settings whenever we have a token
    const fetchUser = useCallback(async () => {
        if (!token) {
            setUser(null)
            setSettings(DEFAULT_SETTINGS)
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const data = await getMe()
            const safeUser = { ...data.user }
            delete safeUser.password
            setUser(safeUser)
            setSettings({
                defaultDuration: data.user.defaultDuration ?? DEFAULT_SETTINGS.defaultDuration,
                dailyGoal: data.user.dailyGoal ?? DEFAULT_SETTINGS.dailyGoal,
                soundEnabled: data.user.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
            })
        } catch {
            // Token invalid/expired — clear auth
            setToken(null)
            setUser(null)
            setSettings(DEFAULT_SETTINGS)
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        fetchUser()
    }, [fetchUser])

    const loginAuth = (newToken) => {
        setLoading(true)
        setToken(newToken)
        // User profile + settings will be loaded by the fetchUser effect
    }

    const logout = () => {
        setToken(null)
        setUser(null)
        setSettings(DEFAULT_SETTINGS)
    }

    // Called from Settings page after a successful update
    const applySettings = (updatedUser) => {
        const safeUser = { ...updatedUser }
        delete safeUser.password
        setUser(safeUser)
        setSettings({
            defaultDuration: updatedUser.defaultDuration ?? DEFAULT_SETTINGS.defaultDuration,
            dailyGoal: updatedUser.dailyGoal ?? DEFAULT_SETTINGS.dailyGoal,
            soundEnabled: updatedUser.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
        })
    }

    const value = {
        token,
        user,
        settings,
        loading,
        isAuthenticated: Boolean(token && user),
        loginAuth,
        logout,
        applySettings,
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
