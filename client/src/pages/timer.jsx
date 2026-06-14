import { useState, useEffect, useRef } from 'react'
import { startSession, completeSession } from '../services/sessionService'

function Timer() {
    const [seconds, setSeconds] = useState(1500)
    const [isRunning, setIsRunning] = useState(false)
    const [duration, setDuration] = useState(25)
    const sessionIdRef = useRef(null)

    const handleStart = async () => {
        const data = await startSession()
        sessionIdRef.current = data.session._id
        setIsRunning(true)
    }

    useEffect(() => {
        if (!isRunning) return

        if (seconds === 0) {
            setIsRunning(false)
            const handleComplete = async () => {
                await completeSession(sessionIdRef.current)
                alert('Session complete! Take a break.')
            }
            handleComplete()
            return
        }

        const interval = setInterval(() => {
            setSeconds(prev => prev - 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [isRunning, seconds])

    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const display = `${minutes}:${secs < 10 ? '0' + secs : secs}`

    return (
        <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Focus Timer</h1>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '48px' }}>Stay focused, track your sessions</p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>

                {!isRunning && seconds === duration * 60 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[5, 10, 15, 25].map(min => (
                                <button key={min}
                                    onClick={() => { setDuration(min); setSeconds(min * 60) }}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '6px',
                                        border: '1px solid #2a2a2a',
                                        background: duration === min ? '#534AB7' : 'none',
                                        color: '#e8e8e8',
                                        fontSize: '13px'
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
                                    if (val > 0) {
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

                <div style={{
                    fontSize: '72px', fontWeight: '500', letterSpacing: '-3px',
                    color: '#e8e8e8', marginBottom: '8px', fontVariantNumeric: 'tabular-nums'
                }}>
                    {display}
                </div>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '36px' }}>
                    {isRunning ? 'Session in progress...' : 'Ready to focus'}
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                    {!isRunning ? (
                        <button onClick={handleStart} style={{
                            padding: '10px 28px', background: '#534AB7', border: 'none',
                            borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '500'
                        }}>Start</button>
                    ) : (
                        <button onClick={() => setIsRunning(false)} style={{
                            padding: '10px 28px', background: 'none', border: '1px solid #2a2a2a',
                            borderRadius: '8px', color: '#e8e8e8', fontSize: '14px'
                        }}>Pause</button>
                    )}
                    <button onClick={() => { setIsRunning(false); setSeconds(duration * 60) }} style={{
                        padding: '10px 28px', background: 'none', border: '1px solid #2a2a2a',
                        borderRadius: '8px', color: '#e8e8e8', fontSize: '14px'
                    }}>Reset</button>
                </div>
            </div>
        </div>
    )
}

export default Timer