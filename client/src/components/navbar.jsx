import { Link, useNavigate } from 'react-router-dom'

function Navbar() {
    const token = localStorage.getItem('token')
    const navigate = useNavigate()

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
                {token ? (
                    <>
                        <Link to="/dashboard" style={{ fontSize: '13px', color: '#888', padding: '6px 12px' }}>Dashboard</Link>
                        <Link to="/timer" style={{ fontSize: '13px', color: '#888', padding: '6px 12px' }}>Timer</Link>
                        <button onClick={() => { localStorage.removeItem('token'); navigate('/login') }}
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