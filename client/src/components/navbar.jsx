import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
    const { isAuthenticated, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: '1px solid #1e1e1e',
            background: '#0a0a0a'
        }}>
            <Link to="/dashboard" style={{ fontSize: '16px', fontWeight: '500', color: '#e8e8e8' }}>
                Focus<span style={{ color: '#7F77DD' }}>OS</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAuthenticated ? (
                    <>
                        <Link to="/dashboard" style={{ fontSize: '13px', color: '#888', padding: '6px 12px' }}>Dashboard</Link>
                        <Link to="/timer" style={{ fontSize: '13px', color: '#888', padding: '6px 12px' }}>Timer</Link>
                        <button onClick={handleLogout}
                            style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #2a2a2a', background: 'none', color: '#e8e8e8' }}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" style={{ fontSize: '13px', color: '#888', padding: '6px 12px' }}>Login</Link>
                        <Link to="/register" style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #2a2a2a', color: '#e8e8e8' }}>Register</Link>
                    </>
                )}
            </div>
        </nav>
    )
}

export default Navbar