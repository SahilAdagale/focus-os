import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateSettings } from '../services/userService'

// Reusable section card
function Section({ title, description, children }) {
    return (
        <div style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '16px',
        }}>
            <h2 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '4px' }}>{title}</h2>
            {description && <p style={{ fontSize: '13px', color: '#555', marginBottom: '20px' }}>{description}</p>}
            {children}
        </div>
    )
}

// Inline feedback message
function Feedback({ status }) {
    if (!status) return null
    const isError = status.type === 'error'
    return (
        <p style={{
            fontSize: '13px',
            marginTop: '12px',
            color: isError ? '#E24B4A' : '#1D9E75',
        }}>
            {isError ? '✕ ' : '✓ '}{status.message}
        </p>
    )
}

const inputStyle = {
    padding: '10px 14px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#e8e8e8',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
}

const saveBtn = (loading) => ({
    padding: '8px 20px',
    background: loading ? '#3d3690' : '#534AB7',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500',
    opacity: loading ? 0.7 : 1,
    cursor: loading ? 'not-allowed' : 'pointer',
    marginTop: '14px',
    transition: 'all 0.2s ease',
})

function Settings() {
    const { user, settings, applySettings } = useAuth()

    // Profile section state
    const [name, setName] = useState(user?.name || '')
    const [profileStatus, setProfileStatus] = useState(null)
    const [profileLoading, setProfileLoading] = useState(false)

    // Password section state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [passwordStatus, setPasswordStatus] = useState(null)
    const [passwordLoading, setPasswordLoading] = useState(false)

    // Timer defaults state
    const [defaultDuration, setDefaultDuration] = useState(settings.defaultDuration)
    const [timerStatus, setTimerStatus] = useState(null)
    const [timerLoading, setTimerLoading] = useState(false)

    // Preferences state
    const [dailyGoal, setDailyGoal] = useState(settings.dailyGoal)
    const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled)
    const [prefsStatus, setPrefsStatus] = useState(null)
    const [prefsLoading, setPrefsLoading] = useState(false)

    const handleSaveProfile = async () => {
        if (name.trim().length < 1) {
            setProfileStatus({ type: 'error', message: 'Name cannot be empty' })
            return
        }
        setProfileLoading(true)
        setProfileStatus(null)
        try {
            const data = await updateSettings({ name: name.trim() })
            applySettings(data.user)
            setProfileStatus({ type: 'success', message: 'Name updated successfully' })
        } catch (err) {
            setProfileStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update name' })
        } finally {
            setProfileLoading(false)
        }
    }

    const handleSavePassword = async () => {
        if (!currentPassword) {
            setPasswordStatus({ type: 'error', message: 'Enter your current password' })
            return
        }
        if (newPassword.length < 8) {
            setPasswordStatus({ type: 'error', message: 'New password must be at least 8 characters' })
            return
        }
        setPasswordLoading(true)
        setPasswordStatus(null)
        try {
            await updateSettings({ currentPassword, newPassword })
            setPasswordStatus({ type: 'success', message: 'Password changed successfully' })
            setCurrentPassword('')
            setNewPassword('')
        } catch (err) {
            setPasswordStatus({ type: 'error', message: err.response?.data?.message || 'Failed to change password' })
        } finally {
            setPasswordLoading(false)
        }
    }

    const handleSaveTimer = async () => {
        setTimerLoading(true)
        setTimerStatus(null)
        try {
            const data = await updateSettings({ defaultDuration })
            applySettings(data.user)
            setTimerStatus({ type: 'success', message: `Default timer set to ${defaultDuration} min` })
        } catch (err) {
            setTimerStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update' })
        } finally {
            setTimerLoading(false)
        }
    }

    const handleSavePrefs = async () => {
        const goal = Number(dailyGoal)
        if (!goal || goal < 1) {
            setPrefsStatus({ type: 'error', message: 'Daily goal must be at least 1 minute' })
            return
        }
        setPrefsLoading(true)
        setPrefsStatus(null)
        try {
            const data = await updateSettings({ dailyGoal: goal, soundEnabled })
            applySettings(data.user)
            setPrefsStatus({ type: 'success', message: 'Preferences saved' })
        } catch (err) {
            setPrefsStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update' })
        } finally {
            setPrefsLoading(false)
        }
    }

    const DURATION_PRESETS = [5, 10, 15, 25, 45, 60]

    return (
        <div style={{ padding: '32px 24px', maxWidth: '640px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '4px' }}>Settings</h1>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '32px' }}>
                Manage your profile, password, and app preferences
            </p>

            {/* ── Profile ─────────────────────────────────────── */}
            <Section title="Profile" description="Update your display name">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#666' }}>Email</label>
                    <input
                        value={user?.email || ''}
                        disabled
                        style={{ ...inputStyle, opacity: 0.4, cursor: 'not-allowed' }}
                    />
                    <label style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>Name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Your name"
                        style={inputStyle}
                    />
                </div>
                <button onClick={handleSaveProfile} disabled={profileLoading} style={saveBtn(profileLoading)}>
                    {profileLoading ? 'Saving...' : 'Save name'}
                </button>
                <Feedback status={profileStatus} />
            </Section>

            {/* ── Password ────────────────────────────────────── */}
            <Section title="Password" description="Change your account password">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        style={inputStyle}
                    />
                    <input
                        type="password"
                        placeholder="New password (min 8 characters)"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <button onClick={handleSavePassword} disabled={passwordLoading} style={saveBtn(passwordLoading)}>
                    {passwordLoading ? 'Updating...' : 'Change password'}
                </button>
                <Feedback status={passwordStatus} />
            </Section>

            {/* ── Timer Defaults ───────────────────────────────── */}
            <Section title="Timer Defaults" description="Choose your default focus duration when the timer page loads">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {DURATION_PRESETS.map(min => (
                        <button
                            key={min}
                            onClick={() => setDefaultDuration(min)}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '8px',
                                border: `1px solid ${defaultDuration === min ? '#534AB7' : '#2a2a2a'}`,
                                background: defaultDuration === min ? 'rgba(83,74,183,0.15)' : 'none',
                                color: defaultDuration === min ? '#7F77DD' : '#888',
                                fontSize: '13px',
                                fontWeight: defaultDuration === min ? '500' : '400',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {min}m
                        </button>
                    ))}
                </div>
                <button onClick={handleSaveTimer} disabled={timerLoading} style={saveBtn(timerLoading)}>
                    {timerLoading ? 'Saving...' : `Save default (${defaultDuration} min)`}
                </button>
                <Feedback status={timerStatus} />
            </Section>

            {/* ── Preferences ─────────────────────────────────── */}
            <Section title="Preferences" description="Customize your focus experience">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Daily goal */}
                    <div>
                        <label style={{ fontSize: '13px', color: '#888', display: 'block', marginBottom: '8px' }}>
                            Daily focus goal (minutes)
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="number"
                                min="1"
                                max="720"
                                value={dailyGoal}
                                onChange={e => setDailyGoal(e.target.value)}
                                style={{ ...inputStyle, width: '120px' }}
                            />
                            <span style={{ fontSize: '13px', color: '#555' }}>
                                = {Math.floor(dailyGoal / 60)}h {dailyGoal % 60}m
                            </span>
                        </div>
                    </div>

                    {/* Sound toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            id="soundEnabled"
                            checked={soundEnabled}
                            onChange={e => setSoundEnabled(e.target.checked)}
                            style={{ accentColor: '#534AB7', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="soundEnabled" style={{ fontSize: '13px', color: '#888', cursor: 'pointer' }}>
                            Play audio chime when timer completes
                        </label>
                    </div>
                </div>
                <button onClick={handleSavePrefs} disabled={prefsLoading} style={saveBtn(prefsLoading)}>
                    {prefsLoading ? 'Saving...' : 'Save preferences'}
                </button>
                <Feedback status={prefsStatus} />
            </Section>
        </div>
    )
}

export default Settings
