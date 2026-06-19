const DEFAULT_API_BASE = 'http://localhost:8080/api'
const STORAGE_KEYS = {
    token: 'focusOsToken',
    apiBase: 'focusOsApiBase',
    sessionId: 'focusOsSessionId',
    sessionDeadlineAt: 'focusOsSessionDeadlineAt',
    trackingEnabled: 'focusOsTrackingEnabled',
    queue: 'focusOsEventQueue',
    activeTabState: 'focusOsActiveTabState',
    idleStartedAt: 'focusOsIdleStartedAt'
}

const DISTRACTING_DOMAINS = new Set([
    'facebook.com',
    'instagram.com',
    'reddit.com',
    'spotify.com',
    'open.spotify.com',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'youtube.com',
    'netflix.com',
    'primevideo.com'
])

const PRODUCTIVE_DOMAINS = new Set([
    'github.com',
    'gitlab.com',
    'stackoverflow.com',
    'developer.mozilla.org',
    'docs.google.com',
    'notion.so',
    'localhost',
    '127.0.0.1'
])

let activeTab = null
let activeStartedAt = Date.now()
let idleStartedAt = null

restoreRuntimeState()

chrome.runtime.onInstalled.addListener(async () => {
    await chrome.idle.setDetectionInterval(60)
    await ensureFlushAlarm()
    const { focusOsTrackingEnabled } = await chrome.storage.local.get(STORAGE_KEYS.trackingEnabled)
    if (focusOsTrackingEnabled === undefined) {
        await chrome.storage.local.set({ [STORAGE_KEYS.trackingEnabled]: true })
    }
    await initializeActiveTab()
})

chrome.runtime.onStartup.addListener(async () => {
    await chrome.idle.setDetectionInterval(60)
    await ensureFlushAlarm()
    await initializeActiveTab()
})

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
    await restoreRuntimeState()
    await flushActiveInterval('tab_update')
    const tab = await safeGetTab(tabId)
    activeTab = normalizeTab(tab, windowId)
    activeStartedAt = Date.now()
    await persistActiveTab()
    await trackEvent('tab_switch', activeTab)
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!tab.active || !changeInfo.url) return
    await restoreRuntimeState()
    await flushActiveInterval('tab_update')
    activeTab = normalizeTab(tab)
    activeStartedAt = Date.now()
    await persistActiveTab()
    await trackEvent('tab_update', activeTab)
})

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    await restoreRuntimeState()
    await flushActiveInterval('active_window_change')

    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        activeTab = null
        activeStartedAt = Date.now()
        await persistActiveTab()
        await trackEvent('active_window_change', { windowId, category: 'unknown' })
        return
    }

    const [tab] = await chrome.tabs.query({ active: true, windowId })
    activeTab = normalizeTab(tab, windowId)
    activeStartedAt = Date.now()
    await persistActiveTab()
    await trackEvent('active_window_change', activeTab)
})

chrome.idle.onStateChanged.addListener(async (state) => {
    await restoreRuntimeState()
    if (state === 'idle' || state === 'locked') {
        await flushActiveInterval('tab_update')
        idleStartedAt = Date.now()
        await chrome.storage.local.set({ [STORAGE_KEYS.idleStartedAt]: idleStartedAt })
        await trackEvent('idle_start', {
            category: 'unknown',
            metadata: { state }
        })
        return
    }

    if (state === 'active' && idleStartedAt) {
        const durationSeconds = secondsSince(idleStartedAt)
        idleStartedAt = null
        await chrome.storage.local.remove(STORAGE_KEYS.idleStartedAt)
        await initializeActiveTab()
        await trackEvent('idle_end', {
            ...activeTab,
            durationSeconds,
            metadata: { state }
        })
    }
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
    await restoreRuntimeState()
    if (alarm.name === 'flush-attention-events') {
        await flushActiveInterval('tab_update')
        await flushQueuedEvents()
    }
    if (alarm.name === 'complete-focus-session') {
        await completeSessionFromExtension()
    }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'FOCUS_OS_FLUSH') {
        restoreRuntimeState()
            .then(() => flushActiveInterval('tab_update'))
            .then(flushQueuedEvents)
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({ ok: false, error: error.message }))
        return true
    }
    if (message?.type === 'FOCUS_OS_STATUS') {
        getStatus()
            .then(sendResponse)
            .catch((error) => sendResponse({ ok: false, error: error.message }))
        return true
    }
    if (message?.type === 'FOCUS_OS_SET_CONTEXT') {
        setFocusContext(message.payload)
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({ ok: false, error: error.message }))
        return true
    }
    if (message?.type === 'FOCUS_OS_CLEAR_SESSION') {
        clearFocusSession()
            .then(() => sendResponse({ ok: true }))
            .catch((error) => sendResponse({ ok: false, error: error.message }))
        return true
    }
    return false
})

async function initializeActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    activeTab = normalizeTab(tab)
    activeStartedAt = Date.now()
    await persistActiveTab()
}

async function flushActiveInterval(type) {
    await restoreRuntimeState()
    if (!activeTab) return
    const durationSeconds = secondsSince(activeStartedAt)
    if (durationSeconds <= 0) return

    await trackEvent(type, {
        ...activeTab,
        durationSeconds
    })
    activeStartedAt = Date.now()
    await persistActiveTab()
}

async function restoreRuntimeState() {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.activeTabState, STORAGE_KEYS.idleStartedAt])
    if (!activeTab && stored[STORAGE_KEYS.activeTabState]) {
        activeTab = stored[STORAGE_KEYS.activeTabState].activeTab || null
        activeStartedAt = stored[STORAGE_KEYS.activeTabState].activeStartedAt || Date.now()
    }
    if (!idleStartedAt && stored[STORAGE_KEYS.idleStartedAt]) {
        idleStartedAt = stored[STORAGE_KEYS.idleStartedAt]
    }
}

async function persistActiveTab() {
    await chrome.storage.local.set({
        [STORAGE_KEYS.activeTabState]: {
            activeTab,
            activeStartedAt
        }
    })
}

async function ensureFlushAlarm() {
    await chrome.alarms.create('flush-attention-events', { periodInMinutes: 1 })
}

async function trackEvent(type, event = {}) {
    const settings = await getSettings()
    if (!settings.trackingEnabled || !settings.token) return

    const payload = {
        sessionId: settings.sessionId || null,
        type,
        occurredAt: new Date().toISOString(),
        url: event.url || null,
        domain: event.domain || normalizeDomain(event.url),
        title: event.title || null,
        tabId: event.tabId ?? null,
        windowId: event.windowId ?? null,
        category: event.category || categorizeDomain(event.domain || normalizeDomain(event.url)),
        durationSeconds: event.durationSeconds || 0,
        metadata: event.metadata || {}
    }

    if (payload.category === 'distracting' && type === 'tab_update') {
        payload.type = 'distraction_visit'
    }

    try {
        await sendEvent(settings.apiBase, settings.token, payload)
    } catch {
        await enqueueEvent(payload)
    }
}

async function sendEvent(apiBase, token, payload) {
    const response = await fetch(`${apiBase}/attention-events`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        throw new Error(`Attention event failed with ${response.status}`)
    }
}

async function flushQueuedEvents() {
    const settings = await getSettings()
    if (!settings.trackingEnabled || !settings.token) return

    const stored = await chrome.storage.local.get(STORAGE_KEYS.queue)
    const queue = stored[STORAGE_KEYS.queue] || []
    if (queue.length === 0) return

    const batch = queue.slice(0, 250)
    const remaining = queue.slice(250)

    const response = await fetch(`${settings.apiBase}/attention-events/bulk`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${settings.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events: batch })
    })

    if (!response.ok) return
    await chrome.storage.local.set({ [STORAGE_KEYS.queue]: remaining })
}

async function enqueueEvent(event) {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.queue)
    const queue = stored[STORAGE_KEYS.queue] || []
    queue.push(event)
    await chrome.storage.local.set({ [STORAGE_KEYS.queue]: queue.slice(-1000) })
}

async function setFocusContext(payload = {}) {
    const updates = {
        [STORAGE_KEYS.trackingEnabled]: true
    }

    if (payload.token) updates[STORAGE_KEYS.token] = payload.token
    if (payload.apiBase) updates[STORAGE_KEYS.apiBase] = payload.apiBase
    if (payload.sessionId !== undefined) updates[STORAGE_KEYS.sessionId] = payload.sessionId || null
    if (payload.deadlineAt !== undefined) updates[STORAGE_KEYS.sessionDeadlineAt] = payload.deadlineAt || null

    await chrome.storage.local.set(updates)

    if (payload.sessionId && payload.deadlineAt) {
        await chrome.alarms.create('complete-focus-session', { when: payload.deadlineAt })
    }
}

async function clearFocusSession() {
    await flushActiveInterval('tab_update')
    await chrome.storage.local.remove([STORAGE_KEYS.sessionId, STORAGE_KEYS.sessionDeadlineAt])
    await chrome.alarms.clear('complete-focus-session')
    await flushQueuedEvents()
}

async function completeSessionFromExtension() {
    const settings = await getSettings()
    if (!settings.token || !settings.sessionId) return

    await restoreRuntimeState()
    await flushActiveInterval('tab_update')
    await flushQueuedEvents()

    try {
        await fetch(`${settings.apiBase}/session/${settings.sessionId}/complete`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${settings.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
    } finally {
        await chrome.storage.local.remove([STORAGE_KEYS.sessionId, STORAGE_KEYS.sessionDeadlineAt])
    }
}

async function getSettings() {
    const stored = await chrome.storage.local.get([
        STORAGE_KEYS.token,
        STORAGE_KEYS.apiBase,
        STORAGE_KEYS.sessionId,
        STORAGE_KEYS.sessionDeadlineAt,
        STORAGE_KEYS.trackingEnabled
    ])

    return {
        token: stored[STORAGE_KEYS.token],
        apiBase: stored[STORAGE_KEYS.apiBase] || DEFAULT_API_BASE,
        sessionId: stored[STORAGE_KEYS.sessionId],
        sessionDeadlineAt: stored[STORAGE_KEYS.sessionDeadlineAt],
        trackingEnabled: stored[STORAGE_KEYS.trackingEnabled] !== false
    }
}

async function getStatus() {
    const settings = await getSettings()
    const stored = await chrome.storage.local.get(STORAGE_KEYS.queue)
    return {
        ok: true,
        trackingEnabled: settings.trackingEnabled,
        authenticated: Boolean(settings.token),
        apiBase: settings.apiBase,
        sessionId: settings.sessionId || null,
        sessionDeadlineAt: settings.sessionDeadlineAt || null,
        queuedEvents: (stored[STORAGE_KEYS.queue] || []).length,
        activeDomain: activeTab?.domain || null
    }
}

async function safeGetTab(tabId) {
    try {
        return await chrome.tabs.get(tabId)
    } catch {
        return null
    }
}

function normalizeTab(tab, windowId) {
    if (!tab) return null
    const domain = normalizeDomain(tab.url)
    return {
        url: tab.url || null,
        domain,
        title: tab.title || null,
        tabId: tab.id ?? null,
        windowId: windowId ?? tab.windowId ?? null,
        category: categorizeDomain(domain)
    }
}

function normalizeDomain(url) {
    if (!url) return null
    try {
        return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    } catch {
        return null
    }
}

function categorizeDomain(domain) {
    if (!domain) return 'unknown'
    if (DISTRACTING_DOMAINS.has(domain) || [...DISTRACTING_DOMAINS].some(d => domain.endsWith(`.${d}`))) {
        return 'distracting'
    }
    if (PRODUCTIVE_DOMAINS.has(domain) || [...PRODUCTIVE_DOMAINS].some(d => domain.endsWith(`.${d}`))) {
        return 'productive'
    }
    return 'neutral'
}

function secondsSince(startedAt) {
    return Math.max(Math.round((Date.now() - startedAt) / 1000), 0)
}
