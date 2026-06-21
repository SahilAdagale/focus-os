const { Worker } = require('bullmq')
const { getRedisClient } = require('../config/redis')
const { weeklyReportQueue } = require('../config/queue')
const WeeklyReport = require('../models/weeklyReport')
const User = require('../models/user')
const { aggregateWeeklyMetrics } = require('../services/reportAggregationService')
const { generateWeeklyReport } = require('../services/openaiService')
const { emitToUser } = require('../config/socket')

const redisConnection = getRedisClient()

function getPreviousWeekRange() {
    const now = new Date()
    // Find the start of the previous week (Monday)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    return { weekStart, weekEnd }
}

function startWorker() {
    const worker = new Worker('weekly-reports', async (job) => {
        if (job.name === 'weekly-cron-trigger') {
            console.log('Processing weekly cron trigger to enqueue reports for all users...')
            const { weekStart, weekEnd } = getPreviousWeekRange()
            const users = await User.find({}, '_id')
            
            for (const user of users) {
                await weeklyReportQueue.add('generate-weekly-report', {
                    userId: user._id,
                    weekStart,
                    weekEnd
                })
            }
            console.log(`Enqueued weekly report jobs for ${users.length} users.`)
            return
        }

        if (job.name === 'generate-weekly-report') {
            const { userId, weekStart, weekEnd } = job.data
            console.log(`Processing weekly report job for user: ${userId}, week: ${weekStart}`)

            let report = null
            try {
                // 1. Ensure user exists
                const user = await User.findById(userId)
                if (!user) {
                    console.error(`User not found: ${userId}`)
                    return
                }

                // 2. Upsert WeeklyReport status = 'generating'
                report = await WeeklyReport.findOne({ userId, weekStart })
                if (!report) {
                    report = new WeeklyReport({ userId, weekStart, weekEnd })
                }
                report.status = 'generating'
                await report.save()

                emitToUser(userId, 'report:generating', { weekStart, weekEnd })

                // 3. Aggregate metrics
                const metrics = await aggregateWeeklyMetrics(userId, weekStart, weekEnd)

                // 4. Generate AI report
                const aiResult = await generateWeeklyReport(metrics)

                if (!aiResult) {
                    // OpenAI skipped/placeholder
                    report.status = 'failed'
                    await report.save()
                    emitToUser(userId, 'report:failed', { weekStart, error: 'OpenAI API key missing or invalid' })
                    return
                }

                // 5. Complete report
                report.metrics = metrics
                report.report = aiResult.report
                report.status = 'completed'
                report.openaiModel = aiResult.model
                report.generatedAt = new Date()
                await report.save()

                console.log(`Successfully completed weekly report for user: ${userId}, week: ${weekStart}`)
                emitToUser(userId, 'report:generated', report)

            } catch (error) {
                console.error(`Error processing weekly report for user ${userId}:`, error)
                if (report) {
                    report.status = 'failed'
                    await report.save()
                }
                emitToUser(userId, 'report:failed', { weekStart, error: error.message })
                throw error
            }
        }
    }, {
        connection: redisConnection,
        concurrency: 2
    })

    worker.on('failed', (job, err) => {
        console.error(`Job ${job ? job.id : 'unknown'} failed:`, err)
    })

    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed successfully`)
    })

    console.log('Weekly report BullMQ worker started')
    return worker
}

module.exports = {
    startWorker
}
