const mongoose = require('mongoose')
const Session = require('../models/session')
const AttentionEvent = require('../models/attentionEvent')

async function aggregateWeeklyMetrics(userId, weekStart, weekEnd) {
    const start = new Date(weekStart)
    const end = new Date(weekEnd)

    // Fetch sessions in the week with a focusScore
    const sessions = await Session.find({
        userId,
        startTime: { $gte: start, $lte: end },
        status: 'completed',
        focusScore: { $ne: null }
    })

    const totalSessions = sessions.length
    let totalFocusMinutes = 0
    let sumFocusScore = 0
    let totalTabSwitches = 0
    let totalDistractionSeconds = 0
    let totalIdleSeconds = 0
    let totalTrackedSeconds = 0
    let bestSessionScore = null
    let worstSessionScore = null

    const sessionsPerDay = [0, 0, 0, 0, 0, 0, 0]

    sessions.forEach(session => {
        const durationMin = (session.duration || 0) / 60
        totalFocusMinutes += durationMin
        sumFocusScore += session.focusScore

        if (bestSessionScore === null || session.focusScore > bestSessionScore) {
            bestSessionScore = session.focusScore
        }
        if (worstSessionScore === null || session.focusScore < worstSessionScore) {
            worstSessionScore = session.focusScore
        }

        const metrics = session.focusMetrics || {}
        totalTabSwitches += metrics.tabSwitches || 0
        totalDistractionSeconds += metrics.distractingSeconds || 0
        totalIdleSeconds += metrics.idleSeconds || 0
        totalTrackedSeconds += metrics.trackedSeconds || 0

        // Sessions per day (0 = Mon, 6 = Sun)
        const day = session.startTime.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const index = day === 0 ? 6 : day - 1
        sessionsPerDay[index]++
    })

    const avgFocusScore = totalSessions > 0 ? Math.round(sumFocusScore / totalSessions) : 0
    const totalDistractionMinutes = Math.round(totalDistractionSeconds / 60)
    const totalIdleMinutes = Math.round(totalIdleSeconds / 60)
    const avgSwitchesPerMinute = totalFocusMinutes > 0 ? Number((totalTabSwitches / totalFocusMinutes).toFixed(2)) : 0
    const avgDistractionRatio = totalTrackedSeconds > 0 ? Number((totalDistractionSeconds / totalTrackedSeconds).toFixed(2)) : 0

    // Aggregate top domains using MongoDB aggregation
    const topDistractingDomains = await getTopDomains(userId, start, end, 'distracting')
    const topProductiveDomains = await getTopDomains(userId, start, end, 'productive')

    return {
        totalSessions,
        totalFocusMinutes: Math.round(totalFocusMinutes),
        avgFocusScore,
        totalTabSwitches,
        totalDistractionMinutes,
        totalIdleMinutes,
        avgSwitchesPerMinute,
        avgDistractionRatio,
        bestSessionScore,
        worstSessionScore,
        sessionsPerDay,
        topDistractingDomains,
        topProductiveDomains
    }
}

async function getTopDomains(userId, weekStart, weekEnd, category, limit = 5) {
    const results = await AttentionEvent.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                occurredAt: { $gte: weekStart, $lte: weekEnd },
                category: category,
                domain: { $ne: null, $ne: '' }
            }
        },
        {
            $group: {
                _id: '$domain',
                visits: { $sum: 1 },
                totalSeconds: { $sum: '$durationSeconds' }
            }
        },
        {
            $project: {
                _id: 0,
                domain: '$_id',
                visits: 1,
                minutes: { $round: [{ $divide: ['$totalSeconds', 60] }, 1] }
            }
        },
        { $sort: { minutes: -1, visits: -1 } },
        { $limit: limit }
    ])
    return results
}

module.exports = {
    aggregateWeeklyMetrics
}
