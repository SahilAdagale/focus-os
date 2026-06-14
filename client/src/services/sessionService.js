import api from './api'

export const startSession = async () => {
    const response = await api.post('/session/start', {})
    return response.data
}

export const completeSession = async (sessionId) => {
    const response = await api.put(`/session/${sessionId}/complete`, {})
    return response.data
}

export const getSessions = async () => {
    const response = await api.get('/session')
    return response.data
}