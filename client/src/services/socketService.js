import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

let socket

export function connectRealtime(token) {
    if (!token) return null

    if (socket?.connected) {
        return socket
    }

    socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
    })

    return socket
}

export function disconnectRealtime() {
    if (socket) {
        socket.disconnect()
        socket = null
    }
}
