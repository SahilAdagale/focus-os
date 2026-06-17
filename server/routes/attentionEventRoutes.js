const express = require('express')
const router = express.Router()
const protect = require('../middlewares/authMiddleware')
const {
    createAttentionEvent,
    createAttentionEventsBulk,
    getAttentionEvents,
    getAttentionEventSummary
} = require('../controllers/attentionEventController')

router.post('/', protect, createAttentionEvent)
router.post('/bulk', protect, createAttentionEventsBulk)
router.get('/', protect, getAttentionEvents)
router.get('/summary', protect, getAttentionEventSummary)

module.exports = router
