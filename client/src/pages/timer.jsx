import { useState, useEffect, useRef, useCallback } from 'react'
import { startSession, completeSession } from '../services/sessionService'
import Toast from '../components/Toast'

const MODES = {
    focus: { label: 'Focus', color: '#534AB7', colorDim: '#3d3690', glow: 'rgba(83, 74, 183, 0.15)' },
    break: { label: 'Break', color: '#1D9E75', colorDim: '#167a5a', glow: 'rgba(29, 158, 117, 0.15)' },
}

function Timer() {
    const [duration, setDuration] = useState(25)
    const [seconds, setSeconds] = useState(1500)
    const [isRunning, setIsRunning] = useState(false)
    const [mode, setMode] = useState('focus') // 'focus' | 'break'
    const [toast, setToast] = useState(null)
    const [pomodoroCount, setPomodoroCount] = useState(0)
    const [autoStart, setAutoStart] = useState(false)
    const sessionIdRef = useRef(null)
    const hasStartedRef = useRef(false) // tracks if this session was ever started (for resume)

    const totalSeconds = mode === 'focus' ? duration * 60 : (pomodoroCount > 0 && pomodoroCount % 4 === 0 ? 15 : 5) * 60
    const progress = 1 - (seconds / totalSeconds)

    // SVG circle math
    const radius = 120
    const strokeWidth = 6
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - progress)

    const currentMode = MODES[mode]

    // Update browser tab title
    useEffect(() => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        const timeStr = `${mins}:${secs < 10 ? '0' + secs : secs}`
        if (isRunning) {
            document.title = `${timeStr} — ${currentMode.label} — FocusOS`
        } else {
            document.title = 'FocusOS'
        }
        return () => { document.title = 'FocusOS' }
    }, [seconds, isRunning, currentMode.label])

    // Start a new focus session
    const handleStart = async () => {
        if (mode === 'focus' && !hasStartedRef.current) {
            try {
                const data = await startSession(duration * 60)
                sessionIdRef.current = data.session._id
            } catch (err) {
                setToast({ message: 'Failed to start session', type: 'success' })
                return
            }
        }
        hasStartedRef.current = true
        setIsRunning(true)
    }

    // Pause timer (does NOT reset session)
    const handlePause = () => {
        setIsRunning(false)
    }

    // Reset everything
    const handleReset = () => {
        setIsRunning(false)
        hasStartedRef.current = false
        sessionIdRef.current = null
        if (mode === 'focus') {
            setSeconds(duration * 60)
        } else {
            setSeconds(totalSeconds)
        }
    }

    // Switch to break mode
    const switchToBreak = useCallback((shouldStart = false) => {
        const breakMinutes = (pomodoroCount + 1) % 4 === 0 ? 15 : 5
        setMode('break')
        setSeconds(breakMinutes * 60)
        hasStartedRef.current = false
        sessionIdRef.current = null
        if (shouldStart) {
            setIsRunning(true)
            hasStartedRef.current = true
        }
    }, [pomodoroCount])

    // Switch back to focus mode
    const switchToFocus = useCallback((shouldStart = false) => {
        setMode('focus')
        setSeconds(duration * 60)
        hasStartedRef.current = false
        sessionIdRef.current = null
        if (shouldStart) {
            startSession(duration * 60).then(data => {
                sessionIdRef.current = data.session._id
                setIsRunning(true)
                hasStartedRef.current = true
            }).catch(() => {
                setToast({ message: 'Failed to start session', type: 'success' })
            })
        }
    }, [duration])

    // Countdown logic
    useEffect(() => {
        if (!isRunning) return

        if (seconds === 0) {
            setIsRunning(false)
            hasStartedRef.current = false

            if (mode === 'focus') {
                // Complete the session on backend
                const handleComplete = async () => {
                    try {
                        if (sessionIdRef.current) {
                            await completeSession(sessionIdRef.current)
                        }
                    } catch (err) {
                        console.error('Failed to complete session:', err)
                    }
                }
                handleComplete()
                setPomodoroCount(prev => prev + 1)
                setToast({ message: 'Focus session complete! Time for a break.', type: 'success' })

                // Play a subtle chime sound
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)()
                    const osc = ctx.createOscillator()
                    const gain = ctx.createGain()
                    osc.connect(gain)
                    gain.connect(ctx.destination)
                    osc.frequency.setValueAtTime(587, ctx.currentTime) // D5
                    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.15) // G5
                    gain.gain.setValueAtTime(0.15, ctx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
                    osc.start(ctx.currentTime)
                    osc.stop(ctx.currentTime + 0.6)
                } catch (e) { /* audio not available */ }

                // Auto-switch to break after a short delay
                setTimeout(() => switchToBreak(autoStart), 1500)
            } else {
                // Break ended
                setToast({ message: 'Break over — let\'s get back to it!', type: 'info' })
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)()
                    const osc = ctx.createOscillator()
                    const gain = ctx.createGain()
                    osc.connect(gain)
                    gain.connect(ctx.destination)
                    osc.frequency.setValueAtTime(523, ctx.currentTime) // C5
                    gain.gain.setValueAtTime(0.12, ctx.currentTime)
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
                    osc.start(ctx.currentTime)
                    osc.stop(ctx.currentTime + 0.4)
                } catch (e) { /* audio not available */ }

                setTimeout(() => switchToFocus(autoStart), 1500)
            }
            return
        }

        const interval = setInterval(() => {
            setSeconds(prev => prev - 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [isRunning, seconds, mode, autoStart, switchToBreak, switchToFocus])

    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const display = `${minutes}:${secs < 10 ? '0' + secs : secs}`

    const isIdle = !isRunning && !hasStartedRef.current

    return (
        <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Focus Timer</h1>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '48px' }}>Stay focused, track your sessions</p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>

                {/* Mode pills */}
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

                {/* Duration presets — only when idle in focus mode */}
                {mode === 'focus' && isIdle && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[5, 10, 15, 25, 45, 60].map(min => (
                                <button key={min}
                                    onClick={() => { setDuration(min); setSeconds(min * 60) }}
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
                                        setDuration(val)
                                        setSeconds(val * 60)
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

                {/* Circular progress ring */}
                <div style={{ position: 'relative', width: '280px', height: '280px', marginBottom: '24px' }}>
                    <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background track */}
                        <circle
                            cx="140" cy="140" r={radius}
                            fill="none"
                            stroke="#1a1a1a"
                            strokeWidth={strokeWidth}
                        />
                        {/* Progress arc */}
                        <circle
                            cx="140" cy="140" r={radius}
                            fill="none"
                            stroke={currentMode.color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{
                                transition: isRunning ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.4s ease',
                                filter: `drop-shadow(0 0 8px ${currentMode.glow})`,
                            }}
                        />
                    </svg>

                    {/* Time display (centered inside ring) */}
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
                            {isRunning ? (mode === 'focus' ? 'Focusing...' : 'Resting...') : (hasStartedRef.current ? 'Paused' : currentMode.label)}
                        </p>
                    </div>
                </div>

                {/* Auto-start toggle */}
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

                {/* Controls */}
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
                            {hasStartedRef.current ? 'Resume' : 'Start'}
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

                {/* Pomodoro counter */}
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

            {/* Toast animation keyframes */}
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