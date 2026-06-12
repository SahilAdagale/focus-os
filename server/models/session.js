const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
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
    duration: {
        type: Number,
        default: 0
    },
    verified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const Session = mongoose.model("Session", sessionSchema)
module.exports = Session;