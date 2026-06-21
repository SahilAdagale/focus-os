const bcrypt = require('bcrypt')
const User = require('../models/user')
const { cacheGet, cacheSet, cacheInvalidate, userCacheKey } = require('../services/cacheService')

// GET /api/user/me — return current user profile + settings (no password)
const getMe = async (req, res) => {
    try {
        const cacheKey = userCacheKey(req.user.id)
        const cached = await cacheGet(cacheKey)
        if (cached) {
            return res.status(200).json(cached)
        }

        const user = await User.findById(req.user.id).select('-password')
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        const payload = { user }
        await cacheSet(cacheKey, payload, 600)
        res.status(200).json(payload)
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

// PUT /api/user/settings — update profile and/or settings
const updateSettings = async (req, res) => {
    try {
        const { name, currentPassword, newPassword, defaultDuration, dailyGoal, soundEnabled } = req.body
        const user = await User.findById(req.user.id)

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        // Update name
        if (name !== undefined) {
            if (name.trim().length < 1) {
                return res.status(400).json({ message: 'Name cannot be empty' })
            }
            user.name = name.trim()
        }

        // Update password — requires current password verification
        if (newPassword !== undefined) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Current password is required to set a new password' })
            }
            const isValid = await bcrypt.compare(currentPassword, user.password)
            if (!isValid) {
                return res.status(400).json({ message: 'Current password is incorrect' })
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ message: 'New password must be at least 8 characters' })
            }
            user.password = await bcrypt.hash(newPassword, 10)
        }

        // Update timer settings
        if (defaultDuration !== undefined) {
            const dur = Number(defaultDuration)
            if (dur < 1 || dur > 120) {
                return res.status(400).json({ message: 'Default duration must be between 1 and 120 minutes' })
            }
            user.defaultDuration = dur
        }

        if (dailyGoal !== undefined) {
            const goal = Number(dailyGoal)
            if (goal < 1 || goal > 720) {
                return res.status(400).json({ message: 'Daily goal must be between 1 and 720 minutes' })
            }
            user.dailyGoal = goal
        }

        if (soundEnabled !== undefined) {
            user.soundEnabled = Boolean(soundEnabled)
        }

        await user.save()
        await cacheInvalidate(userCacheKey(req.user.id))

        // Return updated user without password
        const updatedUser = user.toObject()
        delete updatedUser.password

        res.status(200).json({ message: 'Settings updated', user: updatedUser })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

module.exports = { getMe, updateSettings }
