import axios from 'axios'

const API = 'http://localhost:8080/api/auth'

export const login = async (email, password) => {
    const response = await axios.post(`${API}/login`, { email, password })
    return response.data
}