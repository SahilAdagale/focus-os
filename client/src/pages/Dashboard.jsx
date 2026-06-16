import { useEffect, useState } from 'react'
import { getSessions, deleteSession } from '../services/sessionService'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Dashboard() {
    const { settings } = useAuth()
    const DAILY_GOAL_MINUTES = settings.dailyGoal
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const sessionData = await getSessions()
                setSessions(sessionData.sessions)
            } catch (err) {
                console.error('Failed to fetch data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleDelete = async (sessionId) => {
        setDeletingId(sessionId)
        try {
            await deleteSession(sessionId)
            setSessions(prev => prev.filter(s => s._id !== sessionId))
        } catch (err) {
            console.error('Failed to delete session:', err)
        } finally {
            setDeletingId(null)
        }
    }

    const completedSessions = sessions.filter(s => s.status === 'completed')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaySessions = completedSessions.filter(s => new Date(s.startTime) >= today)
    const todayMinutes = Math.floor(
        todaySessions.reduce((sum, s) => sum + s.duration, 0) / 60
    )
    const goalProgress = Math.min((todayMinutes / DAILY_GOAL_MINUTES) * 100, 100)

    const totalMinutes = Math.floor(
        completedSessions.reduce((sum, s) => sum + s.duration, 0) / 60
    )

    if (loading) {
        return (
            <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
                <p style={{ color: '#666', fontSize: '14px' }}>Loading sessions...</p>
            </div>
        )
    }

    return (
        <div style={{ padding: '32px 24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Dashboard</h1>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Sessions today</p>
                    <p style={{ fontSize: '24px', fontWeight: '500' }}>{todaySessions.length}</p>
                </div>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>Focus today</p>
                    <p style={{ fontSize: '24px', fontWeight: '500' }}>{todayMinutes} <span style={{ fontSize: '14px', color: '#888', fontWeight: '400' }}>min</span></p>
                </div>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>All time</p>
                    <p style={{ fontSize: '24px', fontWeight: '500' }}>{totalMinutes} <span style={{ fontSize: '14px', color: '#888', fontWeight: '400' }}>min</span></p>
                </div>
            </div>

            {/* Daily goal progress */}
            <div style={{
                background: '#111',
                border: '1px solid #1e1e1e',
                borderRadius: '10px',
                padding: '16px 20px',
                marginBottom: '32px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <p style={{ fontSize: '13px', color: '#888' }}>Daily goal</p>
                    <p style={{ fontSize: '12px', color: goalProgress >= 100 ? '#1D9E75' : '#555' }}>
                        {goalProgress >= 100 ? '🎉 Goal reached!' : `${todayMinutes} / ${DAILY_GOAL_MINUTES} min`}
                    </p>
                </div>
                <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        width: `${goalProgress}%`,
                        background: goalProgress >= 100 ? '#1D9E75' : '#534AB7',
                        borderRadius: '3px',
                        transition: 'width 0.6s ease',
                    }} />
                </div>
            </div>

            {/* Session history */}
            <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Recent sessions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {completedSessions.length === 0 ? (
                    <div style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        background: '#111',
                        border: '1px solid #1e1e1e',
                        borderRadius: '10px'
                    }}>
                        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>No sessions yet</p>
                        <p style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>Start your first focus session to see your history here.</p>
                        <Link to="/timer" style={{
                            display: 'inline-block',
                            padding: '8px 20px',
                            background: '#534AB7',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: '500',
                        }}>Start a session →</Link>
                    </div>
                ) : (
                    completedSessions.map(session => (
                        <div key={session._id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 16px', background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px',
                            opacity: deletingId === session._id ? 0.4 : 1,
                            transition: 'opacity 0.2s ease',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }}></div>
                                <span style={{ fontSize: '13px', color: '#888' }}>
                                    {new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{ fontSize: '13px' }}>{Math.floor(session.duration / 60)} min {Math.round(session.duration % 60)} sec</span>
                                {session.plannedDuration > 0 && (
                                    <span style={{ fontSize: '11px', color: '#555' }}>
                                        / {Math.floor(session.plannedDuration / 60)} min goal
                                    </span>
                                )}
                                {session.taskId && (
                                    <span style={{
                                        fontSize: '11px',
                                        color: '#a9a3f5',
                                        background: 'rgba(83, 74, 183, 0.15)',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontWeight: '500',
                                        border: '1px solid rgba(83, 74, 183, 0.3)',
                                        marginLeft: '4px',
                                    }}>
                                        📌 {session.taskId.title}
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#0d2b1e', color: '#1D9E75' }}>completed</span>
                                <button
                                    onClick={() => handleDelete(session._id)}
                                    disabled={deletingId === session._id}
                                    title="Delete session"
                                    style={{
                                        background: 'none',
                                        border: '1px solid transparent',
                                        color: '#555',
                                        fontSize: '14px',
                                        padding: '3px 6px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        lineHeight: 1,
                                        transition: 'color 0.2s, border-color 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#E24B4A'; e.currentTarget.style.borderColor = '#3a1a1a' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = 'transparent' }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default Dashboard