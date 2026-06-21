const Session = require('../models/session')
const mongoose = require('mongoose')
const { scoreAndSaveSession } = require('../services/focusScoringService')
const { emitToUser } = require('../config/socket')
const { cacheGet, cacheSet, cacheInvalidate, sessionsCacheKey } = require('../services/cacheService')

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id)
}

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
        await cacheInvalidate(sessionsCacheKey(req.user.id))
        emitToUser(req.user.id, 'session:started', { session })
        res.status(201).json({ message: "Session started", session })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

const completeSession = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid session id" })
        }

        const session = await Session.findOne({ _id: req.params.id, userId: req.user.id })
        if (!session) {
            return res.status(404).json({ message: "Session not found" })
        }
        if (session.status === "completed") {
            return res.status(200).json({ message: "Session already completed", session })
        }
        session.endTime = new Date()
        session.status = "completed"
        session.duration = (session.endTime - session.startTime) / 1000
        await scoreAndSaveSession(session)
        await cacheInvalidate(sessionsCacheKey(req.user.id))
        emitToUser(req.user.id, 'session:completed', { session })
        res.status(200).json({ message: "Session completed", session })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

const scoreSession = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid session id" })
        }

        const session = await Session.findOne({ _id: req.params.id, userId: req.user.id })
        if (!session) {
            return res.status(404).json({ message: "Session not found" })
        }
        if (session.status !== "completed") {
            return res.status(400).json({ message: "Only completed sessions can be scored" })
        }

        await scoreAndSaveSession(session)
        emitToUser(req.user.id, 'session:scored', { session })
        res.status(200).json({ message: "Session scored", session })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

const getSessions = async (req, res) => {
    try {
        const cacheKey = sessionsCacheKey(req.user.id)
        const cached = await cacheGet(cacheKey)
        if (cached) {
            return res.status(200).json(cached)
        }

        const sessions = await Session.find({ userId: req.user.id }).populate('taskId').sort({ startTime: -1 })
        const payload = { sessions }
        await cacheSet(cacheKey, payload, 300)
        res.status(200).json(payload)
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

const deleteSession = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid session id" })
        }

        const session = await Session.findOne({ _id: req.params.id, userId: req.user.id })
        if (!session) {
            return res.status(404).json({ message: "Session not found" })
        }
        await session.deleteOne()
        await cacheInvalidate(sessionsCacheKey(req.user.id))
        emitToUser(req.user.id, 'session:deleted', { sessionId: req.params.id })
        res.status(200).json({ message: "Session deleted" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { startSession, completeSession, scoreSession, getSessions, deleteSession }
