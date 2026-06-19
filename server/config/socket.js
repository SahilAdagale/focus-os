const jwt = require('jsonwebtoken')
const { Server } = require('socket.io')

let io

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            credentials: true
        }
    })

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token

        if (!token) {
            return next(new Error('Socket auth token missing'))
        }

        try {
            const verified = jwt.verify(token, process.env.JWT_SECRET)
            socket.user = verified
            next()
        } catch {
            next(new Error('Socket auth token invalid'))
        }
    })

    io.on('connection', (socket) => {
        const userRoom = getUserRoom(socket.user.id)
        socket.join(userRoom)

        socket.emit('realtime:connected', {
            ok: true,
            userId: socket.user.id
        })
    })

    return io
}

function getUserRoom(userId) {
    return `user:${userId}`
}

function emitToUser(userId, eventName, payload) {
    if (!io || !userId) return
    io.to(getUserRoom(String(userId))).emit(eventName, payload)
}

module.exports = {
    initSocket,
    emitToUser
}
