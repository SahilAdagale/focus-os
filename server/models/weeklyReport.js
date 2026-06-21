const mongoose = require('mongoose')
const User = require('./user')

const weeklyReportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    weekStart: {
        type: Date,
        required: true
    },
    weekEnd: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'generating', 'completed', 'failed'],
        default: 'pending'
    },
    metrics: {
        totalSessions: { type: Number, default: 0 },
        totalFocusMinutes: { type: Number, default: 0 },
        avgFocusScore: { type: Number, default: 0 },
        totalTabSwitches: { type: Number, default: 0 },
        totalDistractionMinutes: { type: Number, default: 0 },
        totalIdleMinutes: { type: Number, default: 0 },
        avgSwitchesPerMinute: { type: Number, default: 0 },
        avgDistractionRatio: { type: Number, default: 0 },
        bestSessionScore: { type: Number, default: null },
        worstSessionScore: { type: Number, default: null },
        sessionsPerDay: {
            type: [Number],
            default: [0, 0, 0, 0, 0, 0, 0] // Mon-Sun
        },
        topDistractingDomains: [{
            domain: String,
            visits: { type: Number, default: 0 },
            minutes: { type: Number, default: 0 }
        }],
        topProductiveDomains: [{
            domain: String,
            visits: { type: Number, default: 0 },
            minutes: { type: Number, default: 0 }
        }]
    },
    report: {
        summary: { type: String, default: '' },
        strengths: { type: [String], default: [] },
        weaknesses: { type: [String], default: [] },
        patterns: { type: [String], default: [] },
        recommendations: { type: [String], default: [] },
        cognitiveProfile: { type: String, default: '' },
        scoreVerdict: { type: String, default: '' }
    },
    generatedAt: {
        type: Date
    },
    openaiModel: {
        type: String
    }
}, { timestamps: true })

weeklyReportSchema.index({ userId: 1, weekStart: 1 }, { unique: true })

const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema)
module.exports = WeeklyReport
