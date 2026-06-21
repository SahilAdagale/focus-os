const { getRedisClient } = require('../config/redis')

const DEFAULT_TTL = 300 // 5 minutes

/**
 * Get a cached value by key.
 * Returns parsed JSON or null if miss / Redis is down.
 */
async function cacheGet(key) {
    try {
        const redis = getRedisClient()
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null
    } catch {
        return null
    }
}

/**
 * Set a value in cache with an optional TTL (seconds).
 */
async function cacheSet(key, data, ttlSeconds = DEFAULT_TTL) {
    try {
        const redis = getRedisClient()
        await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds)
    } catch {
        // Cache write failures are non-fatal
    }
}

/**
 * Invalidate a single key or a pattern (e.g. "sessions:userId:*").
 */
async function cacheInvalidate(pattern) {
    try {
        const redis = getRedisClient()

        if (pattern.includes('*')) {
            const keys = await redis.keys(pattern)
            if (keys.length > 0) {
                await redis.del(...keys)
            }
        } else {
            await redis.del(pattern)
        }
    } catch {
        // Cache invalidation failures are non-fatal
    }
}

// ── Key builders ──────────────────────────────────────────

function sessionsCacheKey(userId) {
    return `sessions:${userId}`
}

function userCacheKey(userId) {
    return `user:${userId}`
}

module.exports = {
    cacheGet,
    cacheSet,
    cacheInvalidate,
    sessionsCacheKey,
    userCacheKey
}
