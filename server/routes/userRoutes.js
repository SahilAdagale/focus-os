const express = require('express')
const router = express.Router()
const { getMe, updateSettings } = require('../controllers/userController')
const protect = require('../middlewares/authMiddleware')

router.get('/me', protect, getMe)
router.put('/settings', protect, updateSettings)

module.exports = router
