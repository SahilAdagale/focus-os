import { useEffect, useState } from 'react'
import { getSessions } from '../services/sessionService'

// ── Helpers ──────────────────────────────────────────────

function getDayLabel(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
}

function getDateLabel(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getLast7Days() {
    const days = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() - i)
        days.push(d)
    }
    return days
}

function getLast4Weeks() {
    const weeks = []
    for (let i = 3; i >= 0; i--) {
        const days = []
        for (let j = 6; j >= 0; j--) {
            const d = new Date()
            d.setHours(0, 0, 0, 0)
            d.setDate(d.getDate() - (i * 7 + j))
            days.push(d)
        }
        weeks.push(days)
    }
    return weeks
}

function computeStreak(sessions) {
    if (sessions.length === 0) return 0
    const daySet = new Set()
    sessions.forEach(s => {
        const d = new Date(s.startTime)
        daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    })
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Check if today has a session, if not start from yesterday
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    let checkDate = new Date(today)
    if (!daySet.has(todayKey)) {
        checkDate.setDate(checkDate.getDate() - 1)
    }

    while (true) {
        const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`
        if (daySet.has(key)) {
            streak++
            checkDate.setDate(checkDate.getDate() - 1)
        } else {
            break
        }
    }
    return streak
}

// ── Bar Chart Component ──────────────────────────────────

function BarChart({ data, maxValue, accentColor }) {
    const barWidth = 32
    const gap = 12
    const chartHeight = 160
    const chartWidth = data.length * (barWidth + gap) - gap
    const safeMax = maxValue || 1

    return (
        <div style={{ overflowX: 'auto' }}>
            <svg width={chartWidth + 40} height={chartHeight + 40} viewBox={`0 0 ${chartWidth + 40} ${chartHeight + 40}`}>
                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
                    <line key={i}
                        x1={40} y1={chartHeight * (1 - frac) + 10}
                        x2={chartWidth + 40} y2={chartHeight * (1 - frac) + 10}
                        stroke="#1a1a1a" strokeWidth={1}
                    />
                ))}

                {/* Y-axis labels */}
                {[0, 0.5, 1].map((frac, i) => (
                    <text key={i}
                        x={32} y={chartHeight * (1 - frac) + 14}
                        fill="#555" fontSize="10" textAnchor="end"
                    >
                        {Math.round(safeMax * frac)}
                    </text>
                ))}

                {/* Bars */}
                {data.map((item, i) => {
                    const barH = (item.value / safeMax) * chartHeight
                    const x = i * (barWidth + gap) + 40
                    const y = chartHeight - barH + 10

                    return (
                        <g key={i}>
                            {/* Bar */}
                            <rect
                                x={x} y={y}
                                width={barWidth} height={Math.max(barH, 0)}
                                rx={4}
                                fill={item.isToday ? accentColor : `${accentColor}66`}
                                style={{ transition: 'height 0.5s ease, y 0.5s ease' }}
                            />
                            {/* Value label */}
                            {item.value > 0 && (
                                <text
                                    x={x + barWidth / 2} y={y - 6}
                                    fill="#888" fontSize="10" textAnchor="middle"
                                >
                                    {item.value}
                                </text>
                            )}
                            {/* Day label */}
                            <text
                                x={x + barWidth / 2} y={chartHeight + 28}
                                fill={item.isToday ? '#e8e8e8' : '#555'}
                                fontSize="11" textAnchor="middle"
                                fontWeight={item.isToday ? '500' : '400'}
                            >
                                {item.label}
                            </text>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

// ── Contribution Heatmap ─────────────────────────────────

function HeatmapGrid({ weeks, sessionMinutesMap, accentColor }) {
    const cellSize = 18
    const gap = 4

    function getIntensity(minutes) {
        if (minutes === 0) return '#1a1a1a'
        if (minutes < 15) return `${accentColor}33`
        if (minutes < 30) return `${accentColor}66`
        if (minutes < 60) return `${accentColor}99`
        return accentColor
    }

    return (
        <div style={{ display: 'flex', gap: `${gap}px` }}>
            {weeks.map((week, wi) => (
                <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
                    {week.map((day, di) => {
                        const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
                        const mins = sessionMinutesMap[key] || 0
                        return (
                            <div
                                key={di}
                                title={`${getDateLabel(day)}: ${mins} min`}
                                style={{
                                    width: `${cellSize}px`,
                                    height: `${cellSize}px`,
                                    borderRadius: '3px',
                                    background: getIntensity(mins),
                                    transition: 'background 0.3s ease',
                                }}
                            />
                        )
                    })}
                </div>
            ))}
        </div>
    )
}

// ── Main Analytics Page ──────────────────────────────────

function Analytics() {
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const data = await getSessions()
                setSessions(data.sessions)
            } catch (err) {
                console.error('Failed to fetch sessions:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchSessions()
    }, [])

    const completed = sessions.filter(s => s.status === 'completed')

    // ── Compute stats ────────────────────────────────────

    const totalMinutes = Math.round(completed.reduce((sum, s) => sum + s.duration, 0) / 60)
    const totalHours = (totalMinutes / 60).toFixed(1)
    const avgSession = completed.length > 0 ? Math.round(totalMinutes / completed.length) : 0
    const streak = computeStreak(completed)

    // Minutes per day map
    const dayMinutesMap = {}
    completed.forEach(s => {
        const d = new Date(s.startTime)
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        dayMinutesMap[key] = (dayMinutesMap[key] || 0) + Math.round(s.duration / 60)
    })

    // Most productive day of the week
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
    completed.forEach(s => {
        const day = new Date(s.startTime).getDay()
        weekdayTotals[day] += s.duration / 60
    })
    const bestDayIndex = weekdayTotals.indexOf(Math.max(...weekdayTotals))
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const bestDay = completed.length > 0 ? dayNames[bestDayIndex] : '—'

    // Last 7 days bar chart data
    const last7 = getLast7Days()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const barData = last7.map(d => {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        return {
            label: getDayLabel(d),
            value: dayMinutesMap[key] || 0,
            isToday: d.getTime() === today.getTime(),
        }
    })

    const maxBarValue = Math.max(...barData.map(d => d.value), 10)

    // Heatmap data (last 4 weeks)
    const weeks4 = getLast4Weeks()

    // ── Stat card component ──────────────────────────────

    const StatCard = ({ label, value, unit, accent }) => (
        <div style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '10px',
            padding: '20px',
        }}>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
            <p style={{ fontSize: '28px', fontWeight: '500', color: accent || '#e8e8e8', lineHeight: 1 }}>
                {value}
                {unit && <span style={{ fontSize: '14px', color: '#666', fontWeight: '400', marginLeft: '4px' }}>{unit}</span>}
            </p>
        </div>
    )

    if (loading) {
        return (
            <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
                <p style={{ color: '#666', fontSize: '14px' }}>Loading analytics...</p>
            </div>
        )
    }

    return (
        <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Analytics</h1>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '32px' }}>Your focus patterns and progress</p>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
                <StatCard label="Total Focus" value={totalHours} unit="hrs" />
                <StatCard label="Sessions" value={completed.length} />
                <StatCard label="Avg Session" value={avgSession} unit="min" />
                <StatCard label="Current Streak" value={streak} unit={streak === 1 ? 'day' : 'days'} accent={streak > 0 ? '#1D9E75' : undefined} />
            </div>

            {/* Weekly Bar Chart */}
            <div style={{
                background: '#111',
                border: '1px solid #1e1e1e',
                borderRadius: '10px',
                padding: '24px',
                marginBottom: '20px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Last 7 Days</h2>
                        <p style={{ fontSize: '12px', color: '#555' }}>Focus time in minutes per day</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', color: '#555' }}>Best day</p>
                        <p style={{ fontSize: '13px', color: '#7F77DD', fontWeight: '500' }}>{bestDay}</p>
                    </div>
                </div>
                <BarChart data={barData} maxValue={maxBarValue} accentColor="#534AB7" />
            </div>

            {/* Heatmap + Longest Session side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                {/* Heatmap */}
                <div style={{
                    background: '#111',
                    border: '1px solid #1e1e1e',
                    borderRadius: '10px',
                    padding: '24px',
                }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Activity</h2>
                    <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>Last 28 days</p>
                    <HeatmapGrid weeks={weeks4} sessionMinutesMap={dayMinutesMap} accentColor="#534AB7" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px' }}>
                        <span style={{ fontSize: '10px', color: '#555' }}>Less</span>
                        {['#1a1a1a', '#534AB733', '#534AB766', '#534AB799', '#534AB7'].map((c, i) => (
                            <div key={i} style={{ width: '12px', height: '12px', borderRadius: '2px', background: c }} />
                        ))}
                        <span style={{ fontSize: '10px', color: '#555' }}>More</span>
                    </div>
                </div>

                {/* Session breakdown */}
                <div style={{
                    background: '#111',
                    border: '1px solid #1e1e1e',
                    borderRadius: '10px',
                    padding: '24px',
                }}>
                    <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Day Breakdown</h2>
                    <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>Focus minutes by weekday (all time)</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                            // Map display order (Mon=0) to JS day index (Mon=1, ..., Sun=0)
                            const jsIndex = i === 6 ? 0 : i + 1
                            const mins = Math.round(weekdayTotals[jsIndex])
                            const maxWeekday = Math.max(...weekdayTotals, 1)
                            const pct = (mins / maxWeekday) * 100

                            return (
                                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', width: '30px', flexShrink: 0 }}>{day}</span>
                                    <div style={{ flex: 1, height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${pct}%`,
                                            background: jsIndex === bestDayIndex && mins > 0 ? '#534AB7' : '#534AB766',
                                            borderRadius: '3px',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '11px', color: '#555', width: '35px', textAlign: 'right', flexShrink: 0 }}>{mins}m</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {completed.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    background: '#111',
                    border: '1px solid #1e1e1e',
                    borderRadius: '10px',
                }}>
                    <p style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>No data yet</p>
                    <p style={{ fontSize: '13px', color: '#555' }}>Complete your first focus session to start seeing analytics.</p>
                </div>
            )}
        </div>
    )
}

export default Analytics
