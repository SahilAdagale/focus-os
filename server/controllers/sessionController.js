const Session = require('../models/session')

const startSession = async (req, res) => {
    try {
        const session = new Session({
            userId: req.user.id,
            startTime: new Date()
        })

        await session.save()
        res.status(201).json({ message: "Session started", session })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

const completeSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
        if (!session) {
            return res.status(404).json({ message: "Session not found" })
        }
        session.endTime = new Date()
        session.status = "completed"
        session.duration = (session.endTime - session.startTime) / 1000
        await session.save()
        res.status(200).json({ message: "Session completed", session })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { startSession, completeSession }