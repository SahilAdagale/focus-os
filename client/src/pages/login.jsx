import { useState } from 'react'
import { login } from '../services/authService'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

function Login() {

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = await login(email, password)
        console.log(data)
        localStorage.setItem('token', data.token)
        navigate('/dashboard')
    }

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <h1>Login</h1>
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
