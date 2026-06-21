const Redis = require('ioredis')

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

let redisClient = null

function getRedisClient() {
    if (redisClient) return redisClient

    redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        retryStrategy(times) {
            if (times > 10) {
                console.error('Redis: max retries reached, giving up')
                return null
            }
            return Math.min(times * 200, 5000)
        }
    })

    redisClient.on('connect', () => {
        console.log('Redis connected')
    })

    redisClient.on('error', (err) => {
        console.error('Redis error:', err.message)
    })

    return redisClient
}

module.exports = { getRedisClient }
