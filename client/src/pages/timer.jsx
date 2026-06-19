import { useState, useEffect, useRef, useCallback } from 'react'
import { startSession, completeSession } from '../services/sessionService'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import TaskPanel from '../components/TaskPanel'

const MODES = {
    focus: { label: 'Focus', color: '#534AB7', colorDim: '#3d3690', glow: 'rgba(83, 74, 183, 0.15)' },
    break: { label: 'Break', color: '#1D9E75', colorDim: '#167a5a', glow: 'rgba(29, 158, 117, 0.15)' },
}

const TIMER_STORAGE_KEY = 'focusOsTimerState'
const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api`

function loadTimerState(defaultDuration) {
    try {
        const stored = JSON.parse(localStorage.getItem(TIMER_STORAGE_KEY))
        if (!stored) return null

        const fallbackSeconds = defaultDuration * 60
        const remainingSeconds = stored.isRunning && stored.deadlineAt
            ? Math.max(Math.ceil((stored.deadlineAt - Date.now()) / 1000), 0)
            : Number(stored.seconds || fallbackSeconds)

        const expiredWhileAway = Boolean(stored.isRunning && remainingSeconds === 0)

        return {
            duration: Number(stored.duration || defaultDuration),
            seconds: remainingSeconds,
            isRunning: Boolean(stored.isRunning && (remainingSeconds > 0 || expiredWhileAway)),
            mode: stored.mode === 'break' ? 'break' : 'focus',
            pomodoroCount: Number(stored.pomodoroCount || 0),
            autoStart: Boolean(stored.autoStart),
            selectedTaskId: stored.selectedTaskId || null,
            selectedTaskTitle: stored.selectedTaskTitle || null,
            sessionId: stored.sessionId || null,
            hasStarted: Boolean(stored.hasStarted),
            deadlineAt: stored.isRunning && remainingSeconds > 0 ? stored.deadlineAt : null,
        }
    } catch {
        localStorage.removeItem(TIMER_STORAGE_KEY)
        return null
    }
}

function playChime(settings, notes) {
    if (!settings.soundEnabled) return

    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        notes.forEach(([frequency, offset]) => {
            osc.frequency.setValueAtTime(frequency, ctx.currentTime + offset)
        })

        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.6)
    } catch {
        // Audio can fail when the browser has not granted an interaction yet.
    }
}

function postExtensionMessage(type, payload = {}) {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.postMessage({
        source: 'focus-os-web',
        requestId,
        type,
        payload
    }, window.location.origin)

    return requestId
}

function Timer() {
    const { settings, token } = useAuth()
    const savedTimer = loadTimerState(settings.defaultDuration)

    const [duration, setDuration] = useState(savedTimer?.duration || settings.defaultDuration)
    const [seconds, setSeconds] = useState(savedTimer?.seconds || settings.defaultDuration * 60)
    const [isRunning, setIsRunning] = useState(savedTimer?.isRunning || false)
    const [mode, setMode] = useState(savedTimer?.mode || 'focus')
    const [toast, setToast] = useState(null)
    const [pomodoroCount, setPomodoroCount] = useState(savedTimer?.pomodoroCount || 0)
    const [autoStart, setAutoStart] = useState(savedTimer?.autoStart || false)
    const [selectedTaskId, setSelectedTaskId] = useState(savedTimer?.selectedTaskId || null)
    const [selectedTaskTitle, setSelectedTaskTitle] = useState(savedTimer?.selectedTaskTitle || null)
    const [sessionId, setSessionId] = useState(savedTimer?.sessionId || null)
    const [hasStarted, setHasStarted] = useState(savedTimer?.hasStarted || false)
    const [deadlineAt, setDeadlineAt] = useState(savedTimer?.deadlineAt || null)
    const [extensionStatus, setExtensionStatus] = useState({
        connected: false,
        authenticated: false,
        trackingEnabled: false,
        sessionLinked: false,
        queuedEvents: 0,
        activeDomain: null,
    })
    const completionHandledRef = useRef(false)

    const totalSeconds = mode === 'focus' ? duration * 60 : (pomodoroCount > 0 && pomodoroCount % 4 === 0 ? 15 : 5) * 60
    const progress = totalSeconds > 0 ? 1 - (seconds / totalSeconds) : 0
    const radius = 120
    const strokeWidth = 6
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - progress)
    const currentMode = MODES[mode]

    useEffect(() => {
        localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({
            duration,
            seconds,
            isRunning,
            mode,
            pomodoroCount,
            autoStart,
            selectedTaskId,
            selectedTaskTitle,
            sessionId,
            hasStarted,
            deadlineAt,
        }))
    }, [duration, seconds, isRunning, mode, pomodoroCount, autoStart, selectedTaskId, selectedTaskTitle, sessionId, hasStarted, deadlineAt])

    useEffect(() => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        const timeStr = `${mins}:${secs < 10 ? '0' + secs : secs}`
        document.title = isRunning ? `${timeStr} - ${currentMode.label} - FocusOS` : 'FocusOS'
        return () => { document.title = 'FocusOS' }
    }, [seconds, isRunning, currentMode.label])

    useEffect(() => {
        if (!isRunning || !deadlineAt) return

        const updateRemaining = () => {
            setSeconds(Math.max(Math.ceil((deadlineAt - Date.now()) / 1000), 0))
        }

        updateRemaining()
        const interval = setInterval(updateRemaining, 250)
        return () => clearInterval(interval)
    }, [isRunning, deadlineAt])

    useEffect(() => {
        if (!token) return

        postExtensionMessage('FOCUS_OS_SET_CONTEXT', {
            token,
            apiBase: API_BASE,
            sessionId: sessionId || null,
            deadlineAt: deadlineAt || null
        })
    }, [token, sessionId, deadlineAt])

    useEffect(() => {
        const handleExtensionResponse = (event) => {
            if (event.source !== window) return
            if (event.data?.source !== 'focus-os-extension') return
            if (event.data?.type !== 'FOCUS_OS_STATUS_RESULT') return

            const response = event.data.response || {}
            setExtensionStatus({
                connected: Boolean(response.ok),
                authenticated: Boolean(response.authenticated),
                trackingEnabled: Boolean(response.trackingEnabled),
                sessionLinked: Boolean(response.sessionId),
                queuedEvents: response.queuedEvents || 0,
                activeDomain: response.activeDomain || null,
            })
        }

        window.addEventListener('message', handleExtensionResponse)
        return () => window.removeEventListener('message', handleExtensionResponse)
    }, [])

    useEffect(() => {
        const refreshStatus = () => postExtensionMessage('FOCUS_OS_STATUS')
        refreshStatus()
        const interval = setInterval(refreshStatus, 3000)
        return () => clearInterval(interval)
    }, [sessionId, isRunning])

    const switchToBreak = useCallback((shouldStart = false) => {
        const breakMinutes = (pomodoroCount + 1) % 4 === 0 ? 15 : 5
        const breakSeconds = breakMinutes * 60
        completionHandledRef.current = false
        setMode('break')
        setSeconds(breakSeconds)
        setHasStarted(shouldStart)
        setSessionId(null)
        setDeadlineAt(shouldStart ? Date.now() + breakSeconds * 1000 : null)
        setIsRunning(shouldStart)
    }, [pomodoroCount])

    const switchToFocus = useCallback((shouldStart = false) => {
        const focusSeconds = duration * 60
        completionHandledRef.current = false
        setMode('focus')
        setSeconds(focusSeconds)
        setHasStarted(false)
        setSessionId(null)
        setDeadlineAt(null)
        setIsRunning(false)

        if (shouldStart) {
            startSession(duration * 60, selectedTaskId).then(data => {
                setSessionId(data.session._id)
                setDeadlineAt(Date.now() + focusSeconds * 1000)
                setHasStarted(true)
                setIsRunning(true)
            }).catch(() => {
                setToast({ message: 'Failed to start session', type: 'error' })
            })
        }
    }, [duration, selectedTaskId])

    useEffect(() => {
        if (!isRunning || seconds !== 0 || completionHandledRef.current) return

        completionHandledRef.current = true

        setTimeout(() => {
            setIsRunning(false)
            setHasStarted(false)
            setDeadlineAt(null)
        }, 0)

        if (mode === 'focus') {
            const finishSession = async () => {
                try {
                    postExtensionMessage('FOCUS_OS_CLEAR_SESSION')
                    if (sessionId) {
                        await completeSession(sessionId)
                    }
                } catch (err) {
                    console.error('Failed to complete session:', err)
                }
            }

            finishSession()
            setTimeout(() => {
                setSessionId(null)
                setPomodoroCount(prev => prev + 1)
                setToast({ message: 'Focus session complete! Time for a break.', type: 'success' })
                playChime(settings, [[587, 0], [784, 0.15]])
                setTimeout(() => switchToBreak(autoStart), 1500)
            }, 0)
        } else {
            setTimeout(() => {
                setToast({ message: "Break over - let's get back to it!", type: 'info' })
                playChime(settings, [[523, 0]])
                setTimeout(() => switchToFocus(autoStart), 1500)
            }, 0)
        }
    }, [isRunning, seconds, mode, sessionId, autoStart, settings, switchToBreak, switchToFocus])

    const handleStart = async () => {
        if (seconds <= 0) return

        if (mode === 'focus' && !hasStarted) {
            try {
                const data = await startSession(duration * 60, selectedTaskId)
                const nextDeadlineAt = Date.now() + seconds * 1000
                setSessionId(data.session._id)
                setDeadlineAt(nextDeadlineAt)
                postExtensionMessage('FOCUS_OS_SET_CONTEXT', {
                    token,
                    apiBase: API_BASE,
                    sessionId: data.session._id,
                    deadlineAt: nextDeadlineAt
                })
            } catch {
                setToast({ message: 'Failed to start session', type: 'error' })
                return
            }
        }

        completionHandledRef.current = false
        setHasStarted(true)
        setDeadlineAt(prev => prev || Date.now() + seconds * 1000)
        setIsRunning(true)
    }

    const handlePause = () => {
        if (deadlineAt) {
            setSeconds(Math.max(Math.ceil((deadlineAt - Date.now()) / 1000), 0))
        }
        setDeadlineAt(null)
        setIsRunning(false)
    }

    const handleReset = () => {
        completionHandledRef.current = false
        setIsRunning(false)
        setHasStarted(false)
        setSessionId(null)
        setDeadlineAt(null)
        setSeconds(mode === 'focus' ? duration * 60 : totalSeconds)
    }

    const selectDuration = (minutes) => {
        setDuration(minutes)
        setSeconds(minutes * 60)
    }

    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const display = `${minutes}:${secs < 10 ? '0' + secs : secs}`
    const isIdle = !isRunning && !hasStarted

    return (
        <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Focus Timer</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <p style={{ fontSize: '14px', color: '#888' }}>Stay focused, track your sessions</p>
                <span style={{
                    fontSize: '11px',
                    color: extensionStatus.connected && extensionStatus.authenticated ? '#1D9E75' : '#D8A431',
                    background: extensionStatus.connected && extensionStatus.authenticated ? '#0d2b1e' : '#2b220d',
                    padding: '3px 8px',
                    borderRadius: '999px',
                    border: '1px solid #262626',
                }}>
                    {extensionStatus.connected
                        ? extensionStatus.sessionLinked
                            ? `extension linked${extensionStatus.activeDomain ? ` - ${extensionStatus.activeDomain}` : ''}`
                            : extensionStatus.authenticated
                                ? 'extension connected'
                                : 'extension needs login'
                        : 'extension not detected'}
                </span>
                {extensionStatus.queuedEvents > 0 && (
                    <span style={{ fontSize: '11px', color: '#888' }}>{extensionStatus.queuedEvents} queued</span>
                )}
            </div>

            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
                        <button
                            onClick={() => { if (!isRunning) switchToFocus() }}
                            disabled={isRunning}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '20px',
                                border: `1px solid ${mode === 'focus' ? MODES.focus.color : '#2a2a2a'}`,
                                background: mode === 'focus' ? MODES.focus.glow : 'transparent',
                                color: mode === 'focus' ? MODES.focus.color : '#888',
                                fontSize: '13px',
                                fontWeight: '500',
                                opacity: isRunning ? 0.5 : 1,
                            }}
                        >
                            Focus
                        </button>
                        <button
                            onClick={() => { if (!isRunning) switchToBreak() }}
                            disabled={isRunning}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '20px',
                                border: `1px solid ${mode === 'break' ? MODES.break.color : '#2a2a2a'}`,
                                background: mode === 'break' ? MODES.break.glow : 'transparent',
                                color: mode === 'break' ? MODES.break.color : '#888',
                                fontSize: '13px',
                                fontWeight: '500',
                                opacity: isRunning ? 0.5 : 1,
                            }}
                        >
                            Break
                        </button>
                    </div>

                    {mode === 'focus' && isIdle && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[5, 10, 15, 25, 45, 60].map(min => (
                                    <button key={min}
                                        onClick={() => selectDuration(min)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '6px',
                                            border: `1px solid ${duration === min ? currentMode.color : '#2a2a2a'}`,
                                            background: duration === min ? currentMode.glow : 'none',
                                            color: duration === min ? currentMode.color : '#888',
                                            fontSize: '13px',
                                            fontWeight: duration === min ? '500' : '400',
                                            transition: 'all 0.2s ease',
                                        }}>
                                        {min}m
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    placeholder="Custom"
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        if (val > 0 && val <= 120) {
                                            selectDuration(val)
                                        }
                                    }}
                                    style={{
                                        padding: '6px 12px',
                                        background: '#1a1a1a',
                                        border: '1px solid #2a2a2a',
                                        borderRadius: '6px',
                                        color: '#e8e8e8',
                                        fontSize: '13px',
                                        width: '80px'
                                    }}
                                />
                                <span style={{ fontSize: '13px', color: '#888' }}>min</span>
                            </div>
                        </div>
                    )}

                    <div style={{ position: 'relative', width: '280px', height: '280px', marginBottom: '24px' }}>
                        <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="140" cy="140" r={radius} fill="none" stroke="#1a1a1a" strokeWidth={strokeWidth} />
                            <circle
                                cx="140" cy="140" r={radius}
                                fill="none"
                                stroke={currentMode.color}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                style={{
                                    transition: isRunning ? 'stroke-dashoffset 0.25s linear' : 'stroke-dashoffset 0.4s ease',
                                    filter: `drop-shadow(0 0 8px ${currentMode.glow})`,
                                }}
                            />
                        </svg>

                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                fontSize: '56px',
                                fontWeight: '300',
                                letterSpacing: '-2px',
                                color: '#e8e8e8',
                                fontVariantNumeric: 'tabular-nums',
                                lineHeight: 1,
                            }}>
                                {display}
                            </div>
                            <p style={{
                                fontSize: '12px',
                                color: currentMode.color,
                                marginTop: '8px',
                                fontWeight: '500',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                            }}>
                                {isRunning ? (mode === 'focus' ? 'Focusing...' : 'Resting...') : (hasStarted ? 'Paused' : currentMode.label)}
                            </p>
                            {selectedTaskTitle && mode === 'focus' && (
                                <p style={{
                                    fontSize: '10px',
                                    color: '#555',
                                    marginTop: '6px',
                                    maxWidth: '160px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {selectedTaskTitle}
                                </p>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                        <input
                            type="checkbox"
                            id="autoStart"
                            checked={autoStart}
                            onChange={(e) => setAutoStart(e.target.checked)}
                            style={{ accentColor: currentMode.color, cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="autoStart" style={{ fontSize: '13px', color: '#888', cursor: 'pointer' }}>
                            Auto-start next timer (Pomodoro flow)
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
                        {!isRunning ? (
                            <button onClick={handleStart} style={{
                                padding: '10px 32px',
                                background: currentMode.color,
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease',
                            }}>
                                {hasStarted ? 'Resume' : 'Start'}
                            </button>
                        ) : (
                            <button onClick={handlePause} style={{
                                padding: '10px 32px',
                                background: 'none',
                                border: `1px solid ${currentMode.color}`,
                                borderRadius: '8px',
                                color: currentMode.color,
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                            }}>
                                Pause
                            </button>
                        )}
                        <button onClick={handleReset} style={{
                            padding: '10px 28px',
                            background: 'none',
                            border: '1px solid #2a2a2a',
                            borderRadius: '8px',
                            color: '#888',
                            fontSize: '14px',
                            transition: 'all 0.2s ease',
                        }}>
                            Reset
                        </button>
                    </div>

                    {pomodoroCount > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: '#111',
                            border: '1px solid #1e1e1e',
                            borderRadius: '20px',
                        }}>
                            {Array.from({ length: Math.min(pomodoroCount, 8) }).map((_, i) => (
                                <div key={i} style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: MODES.focus.color,
                                }} />
                            ))}
                            <span style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}>
                                {pomodoroCount} session{pomodoroCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>

                <TaskPanel
                    selectedTaskId={selectedTaskId}
                    onSelectTask={(id, title) => {
                        setSelectedTaskId(id)
                        setSelectedTaskTitle(title)
                    }}
                    disabled={isRunning}
                />
            </div>

            <style>{`
                @keyframes toastIn {
                    from { opacity: 0; transform: translateY(-12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}

export default Timer
