import { useState } from 'react'
import { login } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()
    const { loginAuth } = useAuth()

    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const data = await login(email, password)
            loginAuth(data.token, data.user)
            navigate('/dashboard')
        } catch (err) {
            setError('Invalid email or password')
        } finally {
            setLoading(false)
        }
    }


    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div style={{
                background: '#111',
                border: '1px solid #1e1e1e',
                borderRadius: '12px',
                padding: '40px',
                width: '100%',
                maxWidth: '400px',
            }}>
                <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '8px' }}>Welcome back</h1>
                <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>Sign in to your account</p>

                {error && <p style={{ color: '#E24B4A', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required
                        style={{ padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e8e8e8', fontSize: '14px' }} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required
                        style={{ padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e8e8e8', fontSize: '14px' }} />
                    <button type="submit" disabled={loading}
                        style={{ padding: '10px', background: loading ? '#3d3690' : '#534AB7', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '500', marginTop: '4px', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <p style={{ fontSize: '13px', color: '#888', marginTop: '20px', textAlign: 'center' }}>
                    Don't have an account? <Link to="/register" style={{ color: '#7F77DD' }}>Register</Link>
                </p>
            </div>
        </div>
    )
}

export default Login
