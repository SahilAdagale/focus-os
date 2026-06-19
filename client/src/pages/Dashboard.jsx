import { useEffect, useState } from 'react'
import { getSessions, deleteSession } from '../services/sessionService'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { connectRealtime, disconnectRealtime } from '../services/socketService'
import { getAttentionEvents } from '../services/attentionEventService'

function scoreColor(score) {
    if (score === null || score === undefined) return '#888'
    if (score >= 75) return '#1D9E75'
    if (score >= 50) return '#D8A431'
    return '#E24B4A'
}

function scoreBackground(score) {
    if (score === null || score === undefined) return '#1a1a1a'
    if (score >= 75) return '#0d2b1e'
    if (score >= 50) return '#2b220d'
    return '#2b1111'
}

function Dashboard() {
    const { settings, token } = useAuth()
    const DAILY_GOAL_MINUTES = settings.dailyGoal
    const [sessions, setSessions] = useState([])
    const [liveEvents, setLiveEvents] = useState([])
    const [realtimeStatus, setRealtimeStatus] = useState('connecting')
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionData, eventData] = await Promise.all([
                    getSessions(),
                    getAttentionEvents({ limit: 20 })
                ])
                setSessions(sessionData.sessions)
                setLiveEvents(eventData.events || [])
            } catch (err) {
                console.error('Failed to fetch data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    useEffect(() => {
        if (!token) return undefined

        const socket = connectRealtime(token)
        if (!socket) return undefined

        const upsertSession = ({ session }) => {
            setSessions(prev => {
                const exists = prev.some(item => item._id === session._id)
                if (exists) {
                    return prev.map(item => item._id === session._id ? session : item)
                }
                return [session, ...prev]
            })
        }

        const removeSession = ({ sessionId }) => {
            setSessions(prev => prev.filter(session => session._id !== sessionId))
        }

        const pushEvent = ({ event }) => {
            setLiveEvents(prev => [event, ...prev].slice(0, 20))
        }

        const pushEvents = ({ events }) => {
            setLiveEvents(prev => [...events.reverse(), ...prev].slice(0, 20))
        }

        socket.on('connect', () => setRealtimeStatus('connected'))
        socket.on('connect_error', () => setRealtimeStatus('disconnected'))
        socket.on('disconnect', () => setRealtimeStatus('disconnected'))
        socket.on('realtime:connected', () => setRealtimeStatus('connected'))
        socket.on('session:started', upsertSession)
        socket.on('session:completed', upsertSession)
        socket.on('session:scored', upsertSession)
        socket.on('session:deleted', removeSession)
        socket.on('attention:event', pushEvent)
        socket.on('attention:events', pushEvents)

        return () => {
            socket.off('connect')
            socket.off('connect_error')
            socket.off('disconnect')
            socket.off('realtime:connected')
            socket.off('session:started', upsertSession)
            socket.off('session:completed', upsertSession)
            socket.off('session:scored', upsertSession)
            socket.off('session:deleted', removeSession)
            socket.off('attention:event', pushEvent)
            socket.off('attention:events', pushEvents)
            disconnectRealtime()
        }
    }, [token])

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
    const todayMinutes = Math.floor(todaySessions.reduce((sum, s) => sum + s.duration, 0) / 60)
    const totalMinutes = Math.floor(completedSessions.reduce((sum, s) => sum + s.duration, 0) / 60)
    const goalProgress = Math.min((todayMinutes / DAILY_GOAL_MINUTES) * 100, 100)
    const scoredTodaySessions = todaySessions.filter(s => typeof s.focusScore === 'number')
    const averageFocusScore = scoredTodaySessions.length > 0
        ? Math.round(scoredTodaySessions.reduce((sum, s) => sum + s.focusScore, 0) / scoredTodaySessions.length)
        : null
    const liveSummary = liveEvents.reduce((summary, event) => {
        summary.totalEvents += 1
        if (event.type === 'tab_switch') summary.tabSwitches += 1
        if (event.category === 'distracting') summary.distractingSeconds += event.durationSeconds || 0
        if (event.type === 'idle_start' || event.type === 'idle_end') summary.idleEvents += 1
        return summary
    }, { totalEvents: 0, tabSwitches: 0, distractingSeconds: 0, idleEvents: 0 })

    if (loading) {
        return (
            <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
                <p style={{ color: '#666', fontSize: '14px' }}>Loading sessions...</p>
            </div>
        )
    }

    return (
        <div style={{ padding: '32px 24px', maxWidth: '980px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Dashboard</h1>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: realtimeStatus === 'connected' ? '#1D9E75' : '#D8A431'
                }} />
                <span style={{ fontSize: '12px', color: '#888' }}>
                    Realtime {realtimeStatus === 'connected' ? 'connected' : 'waiting for events'}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Sessions today" value={todaySessions.length} />
                <StatCard label="Focus today" value={todayMinutes} unit="min" />
                <StatCard label="All time" value={totalMinutes} unit="min" />
                <StatCard label="Avg score" value={averageFocusScore ?? '--'} unit={averageFocusScore === null ? null : '/100'} accent={scoreColor(averageFocusScore)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Live attention</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        <MiniMetric label="Events" value={liveSummary.totalEvents} />
                        <MiniMetric label="Switches" value={liveSummary.tabSwitches} />
                        <MiniMetric label="Distracting" value={`${Math.round(liveSummary.distractingSeconds / 60)}m`} accent={liveSummary.distractingSeconds > 0 ? '#E24B4A' : undefined} />
                        <MiniMetric label="Idle" value={liveSummary.idleEvents} />
                    </div>
                </div>
                <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>Event stream</h2>
                    {liveEvents.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#555' }}>Waiting for extension activity...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflow: 'auto' }}>
                            {liveEvents.map(event => (
                                <EventRow key={event._id || `${event.type}-${event.occurredAt}`} event={event} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
                        {goalProgress >= 100 ? 'Goal reached' : `${todayMinutes} / ${DAILY_GOAL_MINUTES} min`}
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
                        }}>Start a session</Link>
                    </div>
                ) : (
                    completedSessions.map(session => (
                        <SessionRow
                            key={session._id}
                            session={session}
                            deleting={deletingId === session._id}
                            onDelete={() => handleDelete(session._id)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

function StatCard({ label, value, unit, accent }) {
    return (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>{label}</p>
            <p style={{ fontSize: '24px', fontWeight: '500', color: accent || '#e8e8e8' }}>
                {value}
                {unit && <span style={{ fontSize: '14px', color: '#888', fontWeight: '400', marginLeft: '4px' }}>{unit}</span>}
            </p>
        </div>
    )
}

function MiniMetric({ label, value, accent }) {
    return (
        <div style={{ background: '#181818', borderRadius: '8px', padding: '10px' }}>
            <p style={{ fontSize: '10px', color: '#666', marginBottom: '5px' }}>{label}</p>
            <p style={{ fontSize: '18px', fontWeight: '500', color: accent || '#e8e8e8' }}>{value}</p>
        </div>
    )
}

function EventRow({ event }) {
    const title = event.title || event.domain || 'Unknown tab'
    const eventLabel = event.type.replaceAll('_', ' ')

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
                <p
                    title={title}
                    style={{
                        fontSize: '12px',
                        color: event.category === 'distracting' ? '#E24B4A' : '#d7d7d7',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '340px',
                    }}
                >
                    {title}
                </p>
                <p style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    {eventLabel}{event.domain ? ` - ${event.domain}` : ''}
                </p>
            </div>
            <span style={{ fontSize: '11px', color: '#555', flexShrink: 0 }}>
                {event.durationSeconds || 0}s
            </span>
        </div>
    )
}

function SessionRow({ session, deleting, onDelete }) {
    const metrics = session.focusMetrics || {}
    const hasScore = typeof session.focusScore === 'number'
    const distractingMinutes = Math.round((metrics.distractingSeconds || 0) / 60)

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '12px 16px',
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '10px',
            opacity: deleting ? 0.4 : 1,
            transition: 'opacity 0.2s ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }}></div>
                <span style={{ fontSize: '13px', color: '#888' }}>
                    {new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontSize: '13px' }}>{Math.floor(session.duration / 60)} min {Math.round(session.duration % 60)} sec</span>
                {session.plannedDuration > 0 && (
                    <span style={{ fontSize: '11px', color: '#555' }}>/ {Math.floor(session.plannedDuration / 60)} min goal</span>
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
                    }}>{session.taskId.title}</span>
                )}
                <span style={{
                    fontSize: '11px',
                    color: scoreColor(session.focusScore),
                    background: scoreBackground(session.focusScore),
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontWeight: '500',
                }}>
                    {hasScore ? `score ${session.focusScore}/100` : 'score pending'}
                </span>
                <span style={{ fontSize: '11px', color: '#555' }}>{metrics.tabSwitches || 0} switches</span>
                <span style={{ fontSize: '11px', color: distractingMinutes > 0 ? '#E24B4A' : '#555' }}>{distractingMinutes} distracting min</span>
                <span style={{ fontSize: '11px', color: '#555' }}>{metrics.totalEvents || 0} events</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: '#0d2b1e', color: '#1D9E75' }}>completed</span>
                <button
                    onClick={onDelete}
                    disabled={deleting}
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
                    x
                </button>
            </div>
        </div>
    )
}

export default Dashboard
