import { useEffect, useState } from 'react'
import { getReports, generateReport } from '../services/reportService'
import { connectRealtime } from '../services/socketService'
import { useAuth } from '../context/AuthContext'
import Toast from '../components/Toast'

function Reports() {
    const { token } = useAuth()
    const [reports, setReports] = useState([])
    const [selectedReportId, setSelectedReportId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [toast, setToast] = useState(null)

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
    }

    const fetchReports = async (selectLatest = false) => {
        try {
            const data = await getReports()
            const sortedReports = data.reports || []
            setReports(sortedReports)
            
            if (sortedReports.length > 0) {
                // If we want to force select the latest, or if nothing is selected yet
                if (selectLatest || !selectedReportId) {
                    setSelectedReportId(sortedReports[0]._id)
                }
            }
        } catch (err) {
            console.error('Failed to fetch reports:', err)
            showToast('Failed to load reports', 'info')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReports()
    }, [])

    useEffect(() => {
        const socket = connectRealtime(token)
        if (!socket) return

        socket.on('report:generating', (data) => {
            setGenerating(true)
            showToast('AI is generating your weekly report...', 'info')
            // Refresh list to show pending/generating status
            fetchReports()
        })

        socket.on('report:generated', (newReport) => {
            setGenerating(false)
            showToast('Weekly report generated successfully!', 'success')
            // Prepend or update reports list
            setReports(prev => {
                const index = prev.findIndex(r => r._id === newReport._id)
                if (index > -1) {
                    const updated = [...prev]
                    updated[index] = newReport
                    return updated
                }
                return [newReport, ...prev]
            })
            setSelectedReportId(newReport._id)
        })

        socket.on('report:failed', (data) => {
            setGenerating(false)
            showToast(`Report generation failed: ${data.error || 'Unknown error'}`, 'info')
            fetchReports()
        })

        return () => {
            socket.off('report:generating')
            socket.off('report:generated')
            socket.off('report:failed')
        }
    }, [token, selectedReportId])

    const handleGenerate = async () => {
        if (generating) return
        setGenerating(true)
        try {
            await generateReport()
            showToast('Generation request sent. Processing...', 'info')
            // Refresh list to show the new pending/generating entry
            setTimeout(() => fetchReports(true), 1000)
        } catch (err) {
            console.error('Failed to trigger report generation:', err)
            showToast('Failed to trigger report generation', 'info')
            setGenerating(false)
        }
    }

    const formatDateRange = (startStr, endStr) => {
        const start = new Date(startStr)
        const end = new Date(endStr)
        const options = { month: 'short', day: 'numeric', year: 'numeric' }
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`
    }

    const activeReport = reports.find(r => r._id === selectedReportId)

    const isCurrentlyGenerating = generating || (activeReport && (activeReport.status === 'generating' || activeReport.status === 'pending'))

    // Compute max times for bar visualizer
    const getDomainMax = (domains) => {
        if (!domains || domains.length === 0) return 1
        return Math.max(...domains.map(d => d.minutes), 1)
    }

    return (
        <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#e8e8e8', marginBottom: '4px' }}>Cognitive Performance Reports</h1>
                    <p style={{ fontSize: '14px', color: '#888' }}>Weekly AI analysis tracking attention patterns, cognitive state, and context-switching metrics</p>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isCurrentlyGenerating}
                    style={{
                        background: isCurrentlyGenerating ? '#1e1e2f' : '#534AB7',
                        border: 'none',
                        color: isCurrentlyGenerating ? '#666' : '#e8e8e8',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: isCurrentlyGenerating ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {isCurrentlyGenerating ? (
                        <>
                            <span className="spinner" style={{
                                width: '12px',
                                height: '12px',
                                border: '2px solid #555',
                                borderTop: '2px solid #aaa',
                                borderRadius: '50%',
                                display: 'inline-block',
                                animation: 'spin 1s linear infinite'
                            }}></span>
                            Analyzing Data...
                        </>
                    ) : (
                        'Generate Report Now'
                    )}
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                    Loading reports database...
                </div>
            ) : reports.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '64px 24px',
                    background: '#111',
                    border: '1px solid #1e1e1e',
                    borderRadius: '12px',
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px', color: '#e8e8e8' }}>No cognitive reports yet</h3>
                    <p style={{ fontSize: '14px', color: '#666', maxWidth: '480px', margin: '0 auto 24px' }}>
                        Your reports will automatically generate every Monday at midnight once you have completed focus sessions. Or, you can manually trigger a report for this week right now.
                    </p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        style={{
                            background: '#534AB7',
                            border: 'none',
                            color: '#e8e8e8',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                        }}
                    >
                        Trigger Report Generation
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>
                    
                    {/* Sidebar: Historical list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h2 style={{ fontSize: '12px', color: '#555', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '4px' }}>Archive</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
                            {reports.map((report) => {
                                const isSelected = report._id === selectedReportId
                                return (
                                    <div
                                        key={report._id}
                                        onClick={() => setSelectedReportId(report._id)}
                                        style={{
                                            padding: '14px',
                                            background: isSelected ? '#1c1b2d' : '#111',
                                            border: isSelected ? '1px solid #534AB7' : '1px solid #1e1e1e',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '11px', color: '#555' }}>
                                                {new Date(report.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '12px',
                                                fontWeight: '600',
                                                background: report.status === 'completed' ? '#0d2b1e' : report.status === 'failed' ? '#2b0d0d' : '#1a1a3e',
                                                color: report.status === 'completed' ? '#1D9E75' : report.status === 'failed' ? '#d9534f' : '#7F77DD',
                                            }}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: isSelected ? '#7F77DD' : '#aaa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {report.report?.cognitiveProfile || 'Weekly Attention metrics'}
                                        </div>
                                        {report.metrics?.avgFocusScore !== undefined && (
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                                                Score: <span style={{ color: '#e8e8e8', fontWeight: '500' }}>{report.metrics.avgFocusScore}/100</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Main content pane */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {activeReport ? (
                            activeReport.status === 'generating' || activeReport.status === 'pending' ? (
                                <div style={{
                                    background: '#111',
                                    border: '1px solid #1e1e1e',
                                    borderRadius: '12px',
                                    padding: '64px 32px',
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '16px',
                                }}>
                                    <div className="spinner-large" style={{
                                        width: '40px',
                                        height: '40px',
                                        border: '3px solid #1e1e1e',
                                        borderTop: '3px solid #534AB7',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#e8e8e8' }}>AI Cognitive Analysis in Progress</h3>
                                    <p style={{ fontSize: '13px', color: '#666', maxWidth: '380px' }}>
                                        We are aggregating your session data, tab switch logs, and distraction frequencies, then leveraging OpenAI to generate tailored productivity insights. This usually takes around 15 seconds.
                                    </p>
                                </div>
                            ) : activeReport.status === 'failed' ? (
                                <div style={{
                                    background: '#111',
                                    border: '1px solid #1e1e1e',
                                    borderRadius: '12px',
                                    padding: '48px 32px',
                                    textAlign: 'center',
                                    color: '#aaa',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '16px',
                                }}>
                                    <div style={{ fontSize: '36px' }}>⚠️</div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#d9534f' }}>Report Generation Failed</h3>
                                    <p style={{ fontSize: '13px', color: '#666', maxWidth: '400px' }}>
                                        An error occurred while compiling your metrics or querying OpenAI. Please verify that your <code>OPENAI_API_KEY</code> is correctly set in your server configuration, then trigger again.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Report Summary Card */}
                                    <div style={{
                                        background: '#111',
                                        border: '1px solid #1e1e1e',
                                        borderRadius: '12px',
                                        padding: '24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '16px',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                            <div>
                                                <span style={{ fontSize: '12px', color: '#555', fontWeight: '500' }}>
                                                    {formatDateRange(activeReport.weekStart, activeReport.weekEnd)}
                                                </span>
                                                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#7F77DD', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>🧠</span> {activeReport.report?.cognitiveProfile || 'Weekly Insight'}
                                                </h2>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#1c1b2d', padding: '10px 16px', borderRadius: '10px', border: '1px solid #534AB755' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', fontWeight: '600' }}>Focus Score</div>
                                                    <div style={{ fontSize: '12px', color: '#888' }}>Weekly Avg</div>
                                                </div>
                                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#7F77DD' }}>
                                                    {activeReport.metrics?.avgFocusScore}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ height: '1px', background: '#1e1e1e' }}></div>

                                        <div>
                                            <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: '600' }}>Executive Summary</h3>
                                            <p style={{ fontSize: '14px', color: '#ccc', lineHeight: '1.6' }}>
                                                {activeReport.report?.summary}
                                            </p>
                                        </div>

                                        {activeReport.report?.scoreVerdict && (
                                            <div style={{ background: '#171725', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #534AB7' }}>
                                                <p style={{ fontSize: '13px', color: '#aaa', fontStyle: 'italic', lineHeight: '1.5' }}>
                                                    &ldquo;{activeReport.report.scoreVerdict}&rdquo;
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Metrics Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                                            <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', marginBottom: '6px' }}>Focus Duration</p>
                                            <p style={{ fontSize: '20px', fontWeight: '600', color: '#e8e8e8' }}>
                                                {activeReport.metrics?.totalFocusMinutes} <span style={{ fontSize: '12px', color: '#666', fontWeight: '400' }}>min</span>
                                            </p>
                                        </div>
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                                            <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', marginBottom: '6px' }}>Sessions Logged</p>
                                            <p style={{ fontSize: '20px', fontWeight: '600', color: '#e8e8e8' }}>
                                                {activeReport.metrics?.totalSessions} <span style={{ fontSize: '12px', color: '#666', fontWeight: '400' }}>sessions</span>
                                            </p>
                                        </div>
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                                            <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', marginBottom: '6px' }}>Tab Switch Rate</p>
                                            <p style={{ fontSize: '20px', fontWeight: '600', color: '#e8e8e8' }}>
                                                {activeReport.metrics?.avgSwitchesPerMinute} <span style={{ fontSize: '12px', color: '#666', fontWeight: '400' }}>/min</span>
                                            </p>
                                        </div>
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px' }}>
                                            <p style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', marginBottom: '6px' }}>Distraction Ratio</p>
                                            <p style={{ fontSize: '20px', fontWeight: '600', color: '#e8e8e8' }}>
                                                {Math.round((activeReport.metrics?.avgDistractionRatio || 0) * 100)}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Insights Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {/* Strengths */}
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '20px' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1D9E75', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>✓</span> Key Strengths
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {activeReport.report?.strengths?.map((str, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                        <span style={{ color: '#1D9E75', fontSize: '13px' }}>●</span>
                                                        <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.4', margin: 0 }}>{str}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Weaknesses */}
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '20px' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#d9534f', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>⚠️</span> Focus Vulnerabilities
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {activeReport.report?.weaknesses?.map((weak, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                        <span style={{ color: '#d9534f', fontSize: '13px' }}>●</span>
                                                        <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.4', margin: 0 }}>{weak}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Patterns */}
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '20px' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#7F77DD', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>💡</span> Behavioral Patterns
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {activeReport.report?.patterns?.map((pat, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                        <span style={{ color: '#7F77DD', fontSize: '13px' }}>●</span>
                                                        <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.4', margin: 0 }}>{pat}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Recommendations */}
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '20px' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f0ad4e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>⭐</span> Actionable Recommendations
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {activeReport.report?.recommendations?.map((rec, idx) => (
                                                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                        <span style={{ color: '#f0ad4e', fontSize: '13px' }}>●</span>
                                                        <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.4', margin: 0 }}>{rec}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Domain breakdown section */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        {/* Top productive domains */}
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#1D9E75', marginBottom: '16px' }}>Top Productive Domains</h3>
                                            {(!activeReport.metrics?.topProductiveDomains || activeReport.metrics.topProductiveDomains.length === 0) ? (
                                                <p style={{ fontSize: '12px', color: '#555' }}>No productive domain logs found.</p>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {activeReport.metrics.topProductiveDomains.map((d, i) => {
                                                        const maxVal = getDomainMax(activeReport.metrics.topProductiveDomains)
                                                        const pct = (d.minutes / maxVal) * 100
                                                        return (
                                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                                    <span style={{ color: '#aaa', fontWeight: '500' }}>{d.domain}</span>
                                                                    <span style={{ color: '#555' }}>{d.minutes}m ({d.visits} visits)</span>
                                                                </div>
                                                                <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', width: `${pct}%`, background: '#1D9E75', borderRadius: '3px' }} />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Top distracting domains */}
                                        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#d9534f', marginBottom: '16px' }}>Top Distracting Domains</h3>
                                            {(!activeReport.metrics?.topDistractingDomains || activeReport.metrics.topDistractingDomains.length === 0) ? (
                                                <p style={{ fontSize: '12px', color: '#555' }}>No distracting domain logs found.</p>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {activeReport.metrics.topDistractingDomains.map((d, i) => {
                                                        const maxVal = getDomainMax(activeReport.metrics.topDistractingDomains)
                                                        const pct = (d.minutes / maxVal) * 100
                                                        return (
                                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                                    <span style={{ color: '#aaa', fontWeight: '500' }}>{d.domain}</span>
                                                                    <span style={{ color: '#555' }}>{d.minutes}m ({d.visits} visits)</span>
                                                                </div>
                                                                <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '3px', overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', width: `${pct}%`, background: '#d9534f', borderRadius: '3px' }} />
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )
                        ) : (
                            <div style={{ padding: '48px 0', textAlign: 'center', color: '#666', fontSize: '14px' }}>
                                Please select a report from the archive.
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Spinning keyframes injector */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

export default Reports
