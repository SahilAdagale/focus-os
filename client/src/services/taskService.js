import api from './api'

export const getTasks = async () => {
    const response = await api.get('/task')
    return response.data
}

export const createTask = async (title) => {
    const response = await api.post('/task', { title })
    return response.data
}

export const updateTask = async (id, data) => {
    const response = await api.put(`/task/${id}`, data)
    return response.data
}

export const deleteTask = async (id) => {
    const response = await api.delete(`/task/${id}`)
    return response.data
}
