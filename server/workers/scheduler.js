const { weeklyReportQueue } = require('../config/queue')

async function startScheduler() {
    try {
        // Clean up existing repeatable jobs to ensure fresh cron patterns
        const jobs = await weeklyReportQueue.getRepeatableJobs()
        for (const job of jobs) {
            await weeklyReportQueue.removeRepeatableByKey(job.key)
        }

        // Add repeating cron job: runs every Monday at 00:00 (midnight)
        await weeklyReportQueue.add('weekly-cron-trigger', {}, {
            repeat: {
                pattern: '0 0 * * 1'
            }
        })
        console.log('BullMQ weekly cron scheduler registered successfully (0 0 * * 1)')
    } catch (error) {
        console.error('Failed to register BullMQ scheduler:', error)
    }
}

async function scheduleReportForUser(userId) {
    // Manual trigger aggregates from current week's Monday 00:00 to Sunday 23:59:59
    const now = new Date()
    const day = now.getDay() // 0 = Sun, 1 = Mon ...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    
    const weekStart = new Date(now)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    console.log(`Scheduling manual report for user ${userId} for week ${weekStart.toDateString()} to ${weekEnd.toDateString()}`)

    return await weeklyReportQueue.add('generate-weekly-report', {
        userId,
        weekStart,
        weekEnd
    })
}

module.exports = {
    startScheduler,
    scheduleReportForUser
}
