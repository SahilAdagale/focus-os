const mongoose = require('mongoose')

const attentionEventSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        default: null,
        index: true
    },
    type: {
        type: String,
        enum: [
            'tab_switch',
            'tab_update',
            'distraction_visit',
            'idle_start',
            'idle_end',
            'active_window_change'
        ],
        required: true,
        index: true
    },
    occurredAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    url: {
        type: String,
        trim: true,
        default: null
    },
    domain: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
        index: true
    },
    title: {
        type: String,
        trim: true,
        default: null
    },
    tabId: {
        type: Number,
        default: null
    },
    windowId: {
        type: Number,
        default: null
    },
    category: {
        type: String,
        enum: ['productive', 'neutral', 'distracting', 'unknown'],
        default: 'unknown',
        index: true
    },
    durationSeconds: {
        type: Number,
        min: 0,
        default: 0
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true })

attentionEventSchema.index({ userId: 1, occurredAt: -1 })
attentionEventSchema.index({ userId: 1, sessionId: 1, occurredAt: -1 })

const AttentionEvent = mongoose.model('AttentionEvent', attentionEventSchema)
module.exports = AttentionEvent
