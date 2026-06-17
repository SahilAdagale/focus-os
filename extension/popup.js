const DEFAULT_API_BASE = 'http://localhost:8080/api'
const STORAGE_KEYS = {
    token: 'focusOsToken',
    apiBase: 'focusOsApiBase',
    sessionId: 'focusOsSessionId',
    trackingEnabled: 'focusOsTrackingEnabled'
}

const apiBaseInput = document.getElementById('apiBase')
const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const sessionIdInput = document.getElementById('sessionId')
const trackingEnabledInput = document.getElementById('trackingEnabled')
const loginButton = document.getElementById('loginButton')
const saveButton = document.getElementById('saveButton')
const flushButton = document.getElementById('flushButton')
const logoutButton = document.getElementById('logoutButton')
const authStatus = document.getElementById('authStatus')
const statusText = document.getElementById('statusText')

document.addEventListener('DOMContentLoaded', loadState)
loginButton.addEventListener('click', login)
saveButton.addEventListener('click', saveSettings)
flushButton.addEventListener('click', flushEvents)
logoutButton.addEventListener('click', logout)

async function loadState() {
    const stored = await chrome.storage.local.get(Object.values(STORAGE_KEYS))
    apiBaseInput.value = stored[STORAGE_KEYS.apiBase] || DEFAULT_API_BASE
    sessionIdInput.value = stored[STORAGE_KEYS.sessionId] || ''
    trackingEnabledInput.checked = stored[STORAGE_KEYS.trackingEnabled] !== false
    updateAuthStatus(Boolean(stored[STORAGE_KEYS.token]))
    await refreshStatus()
}

async function login() {
    const apiBase = normalizeApiBase(apiBaseInput.value)
    const email = emailInput.value.trim()
    const password = passwordInput.value

    if (!email || !password) {
        setStatus('Email and password are required.')
        return
    }

    try {
        const response = await fetch(`${apiBase}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })

        const data = await response.json()
        if (!response.ok) {
            throw new Error(data.message || 'Login failed')
        }

        await chrome.storage.local.set({
            [STORAGE_KEYS.token]: data.token,
            [STORAGE_KEYS.apiBase]: apiBase
        })
        passwordInput.value = ''
        updateAuthStatus(true)
        setStatus('Logged in. Tracking can now send events.')
        await refreshStatus()
    } catch (error) {
        setStatus(error.message)
    }
}

async function saveSettings() {
    await chrome.storage.local.set({
        [STORAGE_KEYS.apiBase]: normalizeApiBase(apiBaseInput.value),
        [STORAGE_KEYS.sessionId]: sessionIdInput.value.trim(),
        [STORAGE_KEYS.trackingEnabled]: trackingEnabledInput.checked
    })
    setStatus('Settings saved.')
    await refreshStatus()
}

async function flushEvents() {
    const response = await chrome.runtime.sendMessage({ type: 'FOCUS_OS_FLUSH' })
    setStatus(response?.ok ? 'Queued events flushed.' : response?.error || 'Flush failed.')
    await refreshStatus()
}

async function logout() {
    await chrome.storage.local.remove(STORAGE_KEYS.token)
    updateAuthStatus(false)
    setStatus('Logged out. Events will not be sent.')
    await refreshStatus()
}

async function refreshStatus() {
    const response = await chrome.runtime.sendMessage({ type: 'FOCUS_OS_STATUS' })
    if (!response?.ok) return

    setStatus([
        response.trackingEnabled ? 'Tracking on' : 'Tracking off',
        response.authenticated ? 'authenticated' : 'not authenticated',
        `${response.queuedEvents} queued`,
        response.activeDomain ? `active: ${response.activeDomain}` : null
    ].filter(Boolean).join(' | '))
}

function updateAuthStatus(authenticated) {
    authStatus.textContent = authenticated ? 'Connected' : 'Disconnected'
    authStatus.style.color = authenticated ? '#72dfa7' : '#ffb86c'
}

function setStatus(message) {
    statusText.textContent = message
}

function normalizeApiBase(value) {
    return (value || DEFAULT_API_BASE).trim().replace(/\/$/, '')
}
