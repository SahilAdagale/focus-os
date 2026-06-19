const mongoose = require('mongoose')
const AttentionEvent = require('../models/attentionEvent')
const Session = require('../models/session')
const { scoreAndSaveSession } = require('../services/focusScoringService')
const { emitToUser } = require('../config/socket')

const VALID_TYPES = new Set([
    'tab_switch',
    'tab_update',
    'distraction_visit',
    'idle_start',
    'idle_end',
    'active_window_change'
])

const VALID_CATEGORIES = new Set(['productive', 'neutral', 'distracting', 'unknown'])

function normalizeDomain(url, domain) {
    if (domain) return String(domain).trim().toLowerCase()
    if (!url) return null

    try {
        return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    } catch {
        return null
    }
}

function normalizeEventPayload(payload) {
    const type = payload.type
    if (!VALID_TYPES.has(type)) {
        return { error: `Invalid event type: ${type}` }
    }

    const category = payload.category || 'unknown'
    if (!VALID_CATEGORIES.has(category)) {
        return { error: `Invalid category: ${category}` }
    }

    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt) : new Date()
    if (Number.isNaN(occurredAt.getTime())) {
        return { error: 'occurredAt must be a valid date' }
    }

    const durationSeconds = Number(payload.durationSeconds || 0)
    if (Number.isNaN(durationSeconds) || durationSeconds < 0) {
        return { error: 'durationSeconds must be a positive number' }
    }

    return {
        event: {
            sessionId: payload.sessionId || null,
            type,
            occurredAt,
            url: payload.url || null,
            domain: normalizeDomain(payload.url, payload.domain),
            title: payload.title || null,
            tabId: payload.tabId ?? null,
            windowId: payload.windowId ?? null,
            category,
            durationSeconds,
            metadata: payload.metadata || {}
        }
    }
}

async function assertSessionBelongsToUser(sessionId, userId) {
    if (!sessionId) return null
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return { status: 400, message: 'Invalid sessionId' }
    }

    const session = await Session.findOne({ _id: sessionId, userId })
    if (!session) {
        return { status: 404, message: 'Session not found' }
    }

    return null
}

async function rescoreCompletedSession(sessionId, userId) {
    if (!sessionId) return

    const session = await Session.findOne({ _id: sessionId, userId })
    if (session?.status === 'completed') {
        await scoreAndSaveSession(session)
        emitToUser(userId, 'session:scored', { session })
    }
}

const createAttentionEvent = async (req, res) => {
    try {
        const normalized = normalizeEventPayload(req.body)
        if (normalized.error) {
            return res.status(400).json({ message: normalized.error })
        }

        const sessionError = await assertSessionBelongsToUser(normalized.event.sessionId, req.user.id)
        if (sessionError) {
            return res.status(sessionError.status).json({ message: sessionError.message })
        }

        const event = new AttentionEvent({
            ...normalized.event,
            userId: req.user.id
        })

        await event.save()
        emitToUser(req.user.id, 'attention:event', { event })
        await rescoreCompletedSession(event.sessionId, req.user.id)
        res.status(201).json({ event })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

const createAttentionEventsBulk = async (req, res) => {
    try {
        const eventsPayload = Array.isArray(req.body.events) ? req.body.events : []
        if (eventsPayload.length === 0) {
            return res.status(400).json({ message: 'events array is required' })
        }
        if (eventsPayload.length > 250) {
            return res.status(400).json({ message: 'Cannot ingest more than 250 events at once' })
        }

        const normalizedEvents = []
        const sessionIds = new Set()

        for (const payload of eventsPayload) {
            const normalized = normalizeEventPayload(payload)
            if (normalized.error) {
                return res.status(400).json({ message: normalized.error })
            }
            if (normalized.event.sessionId) {
                if (!mongoose.Types.ObjectId.isValid(normalized.event.sessionId)) {
                    return res.status(400).json({ message: 'Invalid sessionId' })
                }
                sessionIds.add(String(normalized.event.sessionId))
            }
            normalizedEvents.push(normalized.event)
        }

        if (sessionIds.size > 0) {
            const ownedSessions = await Session.find({
                _id: { $in: Array.from(sessionIds) },
                userId: req.user.id
            }).select('_id')

            if (ownedSessions.length !== sessionIds.size) {
                return res.status(404).json({ message: 'One or more sessions were not found' })
            }
        }

        const events = await AttentionEvent.insertMany(
            normalizedEvents.map(event => ({ ...event, userId: req.user.id }))
        )

        emitToUser(req.user.id, 'attention:events', {
            insertedCount: events.length,
            events
        })

        await Promise.all(
            Array.from(sessionIds).map(sessionId => rescoreCompletedSession(sessionId, req.user.id))
        )

        res.status(201).json({ insertedCount: events.length, events })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

const getAttentionEvents = async (req, res) => {
    try {
        const { sessionId, type, category, from, to, limit = 100 } = req.query
        const query = { userId: req.user.id }

        if (sessionId) {
            if (!mongoose.Types.ObjectId.isValid(sessionId)) {
                return res.status(400).json({ message: 'Invalid sessionId' })
            }
            query.sessionId = sessionId
        }
        if (type) query.type = type
        if (category) query.category = category
        if (from || to) {
            query.occurredAt = {}
            if (from) query.occurredAt.$gte = new Date(from)
            if (to) query.occurredAt.$lte = new Date(to)
        }

        const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500)
        const events = await AttentionEvent.find(query)
            .sort({ occurredAt: -1 })
            .limit(safeLimit)

        res.status(200).json({ events })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

const getAttentionEventSummary = async (req, res) => {
    try {
        const { sessionId, from, to } = req.query
        const match = { userId: new mongoose.Types.ObjectId(req.user.id) }

        if (sessionId) {
            if (!mongoose.Types.ObjectId.isValid(sessionId)) {
                return res.status(400).json({ message: 'Invalid sessionId' })
            }
            match.sessionId = new mongoose.Types.ObjectId(sessionId)
        }
        if (from || to) {
            match.occurredAt = {}
            if (from) match.occurredAt.$gte = new Date(from)
            if (to) match.occurredAt.$lte = new Date(to)
        }

        const [summary] = await AttentionEvent.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalEvents: { $sum: 1 },
                    tabSwitches: { $sum: { $cond: [{ $eq: ['$type', 'tab_switch'] }, 1, 0] } },
                    distractionVisits: { $sum: { $cond: [{ $eq: ['$type', 'distraction_visit'] }, 1, 0] } },
                    idleEvents: {
                        $sum: {
                            $cond: [{ $in: ['$type', ['idle_start', 'idle_end']] }, 1, 0]
                        }
                    },
                    distractingSeconds: {
                        $sum: {
                            $cond: [{ $eq: ['$category', 'distracting'] }, '$durationSeconds', 0]
                        }
                    },
                    productiveSeconds: {
                        $sum: {
                            $cond: [{ $eq: ['$category', 'productive'] }, '$durationSeconds', 0]
                        }
                    },
                    neutralSeconds: {
                        $sum: {
                            $cond: [{ $eq: ['$category', 'neutral'] }, '$durationSeconds', 0]
                        }
                    }
                }
            },
            { $project: { _id: 0 } }
        ])

        res.status(200).json({
            summary: summary || {
                totalEvents: 0,
                tabSwitches: 0,
                distractionVisits: 0,
                idleEvents: 0,
                distractingSeconds: 0,
                productiveSeconds: 0,
                neutralSeconds: 0
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

module.exports = {
    createAttentionEvent,
    createAttentionEventsBulk,
    getAttentionEvents,
    getAttentionEventSummary
}
