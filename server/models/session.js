const mongoose = require("mongoose");
const User = require("./user");

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required: true
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
    },
    status: {
        type: String,
        enum: ["active", "completed", "cancelled"],
        default: "active"
    },
    plannedDuration: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 0
    },
    focusScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },
    focusBreakdown: {
        sessionDepth: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        switchFrequency: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        distractionRatio: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        }
    },
    focusMetrics: {
        totalEvents: {
            type: Number,
            default: 0
        },
        tabSwitches: {
            type: Number,
            default: 0
        },
        distractionVisits: {
            type: Number,
            default: 0
        },
        idleEvents: {
            type: Number,
            default: 0
        },
        trackedSeconds: {
            type: Number,
            default: 0
        },
        productiveSeconds: {
            type: Number,
            default: 0
        },
        neutralSeconds: {
            type: Number,
            default: 0
        },
        distractingSeconds: {
            type: Number,
            default: 0
        },
        idleSeconds: {
            type: Number,
            default: 0
        },
        switchesPerMinute: {
            type: Number,
            default: 0
        },
        distractionRatio: {
            type: Number,
            default: 0
        }
    },
    scoredAt: {
        type: Date,
        default: null
    },
    verified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const Session = mongoose.model("Session", sessionSchema)
module.exports = Session;
