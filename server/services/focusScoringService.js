const AttentionEvent = require('../models/attentionEvent')

const WEIGHTS = {
    sessionDepth: 0.4,
    switchFrequency: 0.35,
    distractionRatio: 0.25
}

const DEFAULT_TARGET_SECONDS = 25 * 60
const IDEAL_SWITCHES_PER_MINUTE = 0.5
const HIGH_SWITCHES_PER_MINUTE = 4

function clamp(value, min = 0, max = 100) {
    return Math.min(Math.max(value, min), max)
}

function roundScore(value) {
    return Math.round(clamp(value))
}

function calculateSessionDepthScore({ durationSeconds, plannedDurationSeconds, productiveSeconds, trackedSeconds, idleSeconds }) {
    const targetSeconds = plannedDurationSeconds > 0 ? plannedDurationSeconds : DEFAULT_TARGET_SECONDS
    const durationRatio = clamp(durationSeconds / targetSeconds, 0, 1)
    const productiveRatio = trackedSeconds > 0 ? clamp(productiveSeconds / trackedSeconds, 0, 1) : 1
    const idleRatio = durationSeconds > 0 ? clamp(idleSeconds / durationSeconds, 0, 1) : 0

    const depthScore = 100 * ((durationRatio * 0.7) + (productiveRatio * 0.3)) * (1 - (idleRatio * 0.5))
    return roundScore(depthScore)
}

function calculateSwitchFrequencyScore({ tabSwitches, durationSeconds }) {
    const durationMinutes = Math.max(durationSeconds / 60, 1)
    const switchesPerMinute = tabSwitches / durationMinutes

    if (switchesPerMinute <= IDEAL_SWITCHES_PER_MINUTE) {
        return { score: 100, switchesPerMinute }
    }
    if (switchesPerMinute >= HIGH_SWITCHES_PER_MINUTE) {
        return { score: 0, switchesPerMinute }
    }

    const range = HIGH_SWITCHES_PER_MINUTE - IDEAL_SWITCHES_PER_MINUTE
    const penaltyRatio = (switchesPerMinute - IDEAL_SWITCHES_PER_MINUTE) / range
    return {
        score: roundScore(100 * (1 - penaltyRatio)),
        switchesPerMinute
    }
}

function calculateDistractionScore({ distractingSeconds, trackedSeconds, distractionVisits, totalEvents }) {
    let distractionRatio = 0

    if (trackedSeconds > 0) {
        distractionRatio = clamp(distractingSeconds / trackedSeconds, 0, 1)
    } else if (totalEvents > 0) {
        distractionRatio = clamp(distractionVisits / totalEvents, 0, 1)
    }

    return {
        score: roundScore(100 * (1 - distractionRatio)),
        distractionRatio
    }
}

function summarizeEvents(events) {
    return events.reduce((summary, event) => {
        const durationSeconds = Number(event.durationSeconds || 0)

        summary.totalEvents += 1
        summary.trackedSeconds += durationSeconds

        if (event.type === 'tab_switch') summary.tabSwitches += 1
        if (event.type === 'distraction_visit') summary.distractionVisits += 1

        if (event.type === 'idle_start' || event.type === 'idle_end') {
            summary.idleEvents += 1
            summary.idleSeconds += durationSeconds
        }

        if (event.category === 'productive') summary.productiveSeconds += durationSeconds
        if (event.category === 'neutral') summary.neutralSeconds += durationSeconds
        if (event.category === 'distracting') summary.distractingSeconds += durationSeconds

        return summary
    }, {
        totalEvents: 0,
        tabSwitches: 0,
        distractionVisits: 0,
        idleEvents: 0,
        trackedSeconds: 0,
        productiveSeconds: 0,
        neutralSeconds: 0,
        distractingSeconds: 0,
        idleSeconds: 0
    })
}

async function calculateFocusScoreForSession(session) {
    const durationSeconds = Number(session.duration || 0)
    const plannedDurationSeconds = Number(session.plannedDuration || 0)

    const events = await AttentionEvent.find({
        userId: session.userId,
        sessionId: session._id
    }).sort({ occurredAt: 1 })

    const metrics = summarizeEvents(events)

    const sessionDepthScore = calculateSessionDepthScore({
        durationSeconds,
        plannedDurationSeconds,
        productiveSeconds: metrics.productiveSeconds,
        trackedSeconds: metrics.trackedSeconds,
        idleSeconds: metrics.idleSeconds
    })

    const switchResult = calculateSwitchFrequencyScore({
        tabSwitches: metrics.tabSwitches,
        durationSeconds
    })

    const distractionResult = calculateDistractionScore({
        distractingSeconds: metrics.distractingSeconds,
        trackedSeconds: metrics.trackedSeconds,
        distractionVisits: metrics.distractionVisits,
        totalEvents: metrics.totalEvents
    })

    const focusScore = roundScore(
        (sessionDepthScore * WEIGHTS.sessionDepth) +
        (switchResult.score * WEIGHTS.switchFrequency) +
        (distractionResult.score * WEIGHTS.distractionRatio)
    )

    return {
        focusScore,
        focusBreakdown: {
            sessionDepth: sessionDepthScore,
            switchFrequency: switchResult.score,
            distractionRatio: distractionResult.score
        },
        focusMetrics: {
            ...metrics,
            switchesPerMinute: Number(switchResult.switchesPerMinute.toFixed(2)),
            distractionRatio: Number(distractionResult.distractionRatio.toFixed(2))
        }
    }
}

async function scoreAndSaveSession(session) {
    const score = await calculateFocusScoreForSession(session)
    session.focusScore = score.focusScore
    session.focusBreakdown = score.focusBreakdown
    session.focusMetrics = score.focusMetrics
    session.scoredAt = new Date()
    await session.save()
    return session
}

module.exports = {
    WEIGHTS,
    calculateFocusScoreForSession,
    scoreAndSaveSession,
    summarizeEvents
}
