import { useState } from 'react'
import { login } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

function Login() {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const navigate = useNavigate()

    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const data = await login(email, password)
            localStorage.setItem('token', data.token)
            navigate('/dashboard')
        } catch (err) {
            setError('Invalid email or password')
        }
    }


    return (
        <form onSubmit={handleSubmit}>
            <div>
                <h1>Login</h1>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit">Login</button>
            </div>
            <div>
                <p>don't have an account?</p>
                <Link to="/register">Register</Link>
            </div>
        </form>
    )
}

export default Login
