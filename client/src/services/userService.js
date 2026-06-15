import api from './api'

export const getMe = async () => {
    const response = await api.get('/user/me')
    return response.data
}

export const updateSettings = async (data) => {
    const response = await api.put('/user/settings', data)
    return response.data
}
