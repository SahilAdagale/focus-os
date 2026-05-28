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
            setError('Invalid email or password')
        }
    }


    return (
        <form onSubmit={handleSubmit}>
            <div>
                <h1>register</h1>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <label htmlFor="name">Name</label>
                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} />
                <label htmlFor="email">Email</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <label htmlFor="password">Password</label>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit">Register</button>
            </div>
            <div>
                <p>already have an account?</p>
                <Link to="/login">Login</Link>
            </div>
        </form>
    )
}

export default Register