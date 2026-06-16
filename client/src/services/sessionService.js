import api from './api'

export const startSession = async (plannedDuration = 0, taskId = null) => {
    const response = await api.post('/session/start', { plannedDuration, taskId })
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

export const deleteSession = async (sessionId) => {
    const response = await api.delete(`/session/${sessionId}`)
    return response.data
}