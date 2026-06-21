const express = require('express')
const router = express.Router()
const { getReports, getLatestReport, getReportById, generateReport } = require('../controllers/reportController')
const protect = require('../middlewares/authMiddleware')

router.get('/', protect, getReports)
router.get('/latest', protect, getLatestReport)
router.post('/generate', protect, generateReport)
router.get('/:id', protect, getReportById)

module.exports = router
