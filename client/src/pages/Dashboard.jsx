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
        <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Dashboard</h1>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Sessions today</p>
                    <p style={{ fontSize: '24px', fontWeight: '500' }}>{completedSessions.length}</p>
                </div>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Focus time</p>
                    <p style={{ fontSize: '24px', fontWeight: '500' }}>{totalMinutes} <span style={{ fontSize: '14px', color: '#888', fontWeight: '400' }}>min</span></p>
                </div>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Total sessions</p>
                    <p style={{ fontSize: '24px', fontWeight: '500' }}>{sessions.length}</p>
                </div>
            </div>

            <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Recent sessions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedSessions.map(session => (
                    <div key={session._id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1D9E75' }}></div>
                            <span style={{ fontSize: '13px', color: '#888' }}>{new Date(session.startTime).toLocaleTimeString()}</span>
                            <span style={{ fontSize: '13px' }}>{Math.floor(session.duration / 60)} min {Math.floor(session.duration % 60)} sec</span>
                        </div>
                        <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#0d2b1e', color: '#1D9E75' }}>completed</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Dashboard