const { Queue } = require('bullmq')
const { getRedisClient } = require('./redis')

const redisConnection = getRedisClient()

const weeklyReportQueue = new Queue('weekly-reports', {
    connection: redisConnection
})

module.exports = {
    weeklyReportQueue
}
