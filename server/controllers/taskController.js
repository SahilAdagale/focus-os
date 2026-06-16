const Task = require('../models/task')

// GET /api/task — all tasks for user, incomplete first then completed, newest first
const getTasks = async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.id }).sort({ completed: 1, createdAt: -1 })
        res.status(200).json({ tasks })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

// POST /api/task — create a new task
const createTask = async (req, res) => {
    try {
        const { title } = req.body
        if (!title || title.trim().length < 1) {
            return res.status(400).json({ message: 'Title is required' })
        }
        if (title.trim().length > 120) {
            return res.status(400).json({ message: 'Title must be 120 characters or less' })
        }
        const task = new Task({
            userId: req.user.id,
            title: title.trim()
        })
        await task.save()
        res.status(201).json({ task })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

// PUT /api/task/:id — update title or toggle completed
const updateTask = async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.id })
        if (!task) {
            return res.status(404).json({ message: 'Task not found' })
        }
        const { title, completed } = req.body
        if (title !== undefined) {
            if (title.trim().length < 1) {
                return res.status(400).json({ message: 'Title cannot be empty' })
            }
            task.title = title.trim()
        }
        if (completed !== undefined) {
            task.completed = Boolean(completed)
        }
        await task.save()
        res.status(200).json({ task })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

// DELETE /api/task/:id — ownership-checked delete
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.id })
        if (!task) {
            return res.status(404).json({ message: 'Task not found' })
        }
        await task.deleteOne()
        res.status(200).json({ message: 'Task deleted' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

module.exports = { getTasks, createTask, updateTask, deleteTask }
