const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    completed: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const Task = mongoose.model('Task', taskSchema)
module.exports = Task
