const Session = require('../models/session')

const startSession = async (req, res) => {
    try {
        const { plannedDuration, taskId } = req.body
        const session = new Session({
            userId: req.user.id,
            startTime: new Date(),
            plannedDuration: plannedDuration || 0,
            taskId: taskId || null
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

const getSessions = async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.user.id }).populate('taskId').sort({ startTime: -1 })
        res.status(200).json({ sessions })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

const deleteSession = async (req, res) => {
    try {
        const session = await Session.findOne({ _id: req.params.id, userId: req.user.id })
        if (!session) {
            return res.status(404).json({ message: "Session not found" })
        }
        await session.deleteOne()
        res.status(200).json({ message: "Session deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { startSession, completeSession, getSessions, deleteSession }