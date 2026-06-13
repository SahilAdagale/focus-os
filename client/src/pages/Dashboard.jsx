import { useEffect, useState } from 'react'
import { getSessions } from '../services/sessionService'

function Dashboard() {
    const [sessions, setSessions] = useState([])

    useEffect(() => {
        const fetchSessions = async () => {
            const data = await getSessions()
            setSessions(data.sessions)
        }
        fetchSessions()
    }, [])

    const completedSessions = sessions.filter(s => s.status === 'completed')
    const totalMinutes = Math.floor(
        completedSessions.reduce((sum, s) => sum + s.duration, 0) / 60
    )

    return (
        <div>
            <h1>FocusOS Dashboard</h1>
            <p>Sessions completed: {completedSessions.length}</p>
            <p>Total focus time: {totalMinutes} minutes</p>
            <h2>Recent Sessions</h2>
            {completedSessions.map(session => (
                <div key={session._id}>
                    <p>Duration: {Math.floor(session.duration / 60)} mins</p>
                    <p>Date: {new Date(session.startTime).toLocaleDateString()}</p>
                </div>
            ))}
        </div>
    )
}

export default Dashboard