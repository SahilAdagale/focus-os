import api from './api'

export const getAttentionEvents = async (params = {}) => {
    const response = await api.get('/attention-events', { params })
    return response.data
}
