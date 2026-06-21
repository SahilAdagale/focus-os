const WeeklyReport = require('../models/weeklyReport')
const { scheduleReportForUser } = require('../workers/scheduler')

// GET /api/reports - Get all reports for the user
const getReports = async (req, res) => {
    try {
        const reports = await WeeklyReport.find({ userId: req.user.id }).sort({ weekStart: -1 })
        res.status(200).json({ reports })
    } catch (error) {
        console.error('Failed to get reports:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

// GET /api/reports/latest - Get the latest completed report
const getLatestReport = async (req, res) => {
    try {
        const report = await WeeklyReport.findOne({ 
            userId: req.user.id,
            status: 'completed'
        }).sort({ weekStart: -1 })
        
        if (!report) {
            return res.status(404).json({ message: 'No completed reports found' })
        }
        res.status(200).json({ report })
    } catch (error) {
        console.error('Failed to get latest report:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

// GET /api/reports/:id - Get report by ID
const getReportById = async (req, res) => {
    try {
        const report = await WeeklyReport.findOne({
            _id: req.params.id,
            userId: req.user.id
        })
        if (!report) {
            return res.status(404).json({ message: 'Report not found' })
        }
        res.status(200).json({ report })
    } catch (error) {
        console.error('Failed to get report by id:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

// POST /api/reports/generate - Manually trigger report generation
const generateReport = async (req, res) => {
    try {
        // Enqueue report generation job
        await scheduleReportForUser(req.user.id)
        res.status(202).json({ message: 'Report generation queued' })
    } catch (error) {
        console.error('Failed to queue report generation:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
}

module.exports = {
    getReports,
    getLatestReport,
    getReportById,
    generateReport
}
