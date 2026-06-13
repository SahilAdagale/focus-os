import { useState } from 'react'
import { register } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'


function Register() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const navigate = useNavigate()

    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const data = await register(name, email, password)
            localStorage.setItem('token', data.token)
            navigate('/dashboard')
        } catch (err) {
            setError('Email already exists. Try a different one.')
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
                <h1 style={{ fontSize: '22px', fontWeight: '500', marginBottom: '8px' }}>Create account</h1>
                <p style={{ fontSize: '14px', color: '#888', marginBottom: '28px' }}>Start tracking your focus</p>

                {error && <p style={{ color: '#E24B4A', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
                        style={{ padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e8e8e8', fontSize: '14px' }} />
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                        style={{ padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e8e8e8', fontSize: '14px' }} />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                        style={{ padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e8e8e8', fontSize: '14px' }} />
                    <button onClick={handleSubmit}
                        style={{ padding: '10px', background: '#534AB7', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                        Create account
                    </button>
                </div>

                <p style={{ fontSize: '13px', color: '#888', marginTop: '20px', textAlign: 'center' }}>
                    Already have an account? <Link to="/login" style={{ color: '#7F77DD' }}>Login</Link>
                </p>
            </div>
        </div>
    )
}

export default Register