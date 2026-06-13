import axios from 'axios'

const API = 'http://localhost:8080/api/session'

const getToken = () => localStorage.getItem('token')

export const startSession = async () => {
    const response = await axios.post(`${API}/start`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
    })
    return response.data
}

export const completeSession = async (sessionId) => {
    const response = await axios.put(`${API}/${sessionId}/complete`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
    })
    return response.data
}

export const getSessions = async () => {
    const response = await axios.get(`${API}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    })
    return response.data
}