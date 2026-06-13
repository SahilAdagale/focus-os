import { useState, useEffect } from 'react'
import { useRef } from 'react'
import { startSession, completeSession } from '../services/sessionService'


function Timer() {
    const [seconds, setSeconds] = useState(10)
    const [isRunning, setIsRunning] = useState(false)
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
        <div>
            <h1>{display}</h1>
            <button onClick={handleStart}>Start</button>
            <button onClick={() => setIsRunning(false)}>Pause</button>
            <button onClick={() => { setIsRunning(false); setSeconds(10) }}>Reset</button>
        </div>
    )
}

export default Timer