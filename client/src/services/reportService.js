import api from './api'

export const getReports = async () => {
    const response = await api.get('/reports')
    return response.data
}

export const getLatestReport = async () => {
    const response = await api.get('/reports/latest')
    return response.data
}

export const getReportById = async (id) => {
    const response = await api.get(`/reports/${id}`)
    return response.data
}

export const generateReport = async () => {
    const response = await api.post('/reports/generate')
    return response.data
}
