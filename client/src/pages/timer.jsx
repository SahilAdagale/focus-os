import { useState, useEffect } from 'react'

function Timer() {
    const [seconds, setSeconds] = useState(10)
    const [isRunning, setIsRunning] = useState(false)

    useEffect(() => {
        if (!isRunning) return

        if (seconds === 0) {
            setIsRunning(false)
            alert('Session complete! Take a break.')
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
            <button onClick={() => setIsRunning(true)}>Start</button>
            <button onClick={() => setIsRunning(false)}>Pause</button>
            <button onClick={() => { setIsRunning(false); setSeconds(10) }}>Reset</button>
        </div>
    )
}

export default Timer