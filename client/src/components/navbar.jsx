import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Navbar() {
    const { isAuthenticated, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const navLinkStyle = ({ isActive }) => ({
        fontSize: '13px',
        color: isActive ? '#7F77DD' : '#888',
        padding: '6px 12px',
        fontWeight: isActive ? '500' : '400',
        textDecoration: 'none',
    })

    return (
        <nav style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: '1px solid #1e1e1e',
            background: '#0a0a0a'
        }}>
            <Link to="/dashboard" style={{ fontSize: '16px', fontWeight: '500', color: '#e8e8e8', textDecoration: 'none' }}>
                Focus<span style={{ color: '#7F77DD' }}>OS</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAuthenticated ? (
                    <>
                        <NavLink to="/dashboard" style={navLinkStyle}>Dashboard</NavLink>
                        <NavLink to="/timer" style={navLinkStyle}>Timer</NavLink>
                        <NavLink to="/analytics" style={navLinkStyle}>Analytics</NavLink>
                        <button onClick={handleLogout}
                            style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #2a2a2a', background: 'none', color: '#e8e8e8', cursor: 'pointer' }}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <NavLink to="/login" style={navLinkStyle}>Login</NavLink>
                        <Link to="/register" style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '6px', border: '1px solid #2a2a2a', color: '#e8e8e8', textDecoration: 'none' }}>Register</Link>
                    </>
                )}
            </div>
        </nav>
    )
}

export default Navbar