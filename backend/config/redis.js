const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis = null;
let isConnected = false;

const connectRedis = () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
        redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 3) {
                    logger.warn('Redis bağlantısı kurulamadı — cache devre dışı');
                    return null; // Yeniden denemeyi durdur
                }
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
        });

        redis.on('connect', () => {
            isConnected = true;
            logger.info('🔴 Redis bağlantısı başarılı');
        });

        redis.on('error', (err) => {
            isConnected = false;
            logger.warn('Redis hatası (cache devre dışı):', err.message);
        });

        redis.on('close', () => {
            isConnected = false;
        });

        // Bağlantıyı dene ama hata fırlatma
        redis.connect().catch(() => {
            logger.warn('Redis bağlantısı kurulamadı — uygulama Redis olmadan çalışacak');
            isConnected = false;
        });
    } catch (err) {
        logger.warn('Redis başlatılamadı:', err.message);
    }

    return redis;
};

// Cache helper fonksiyonları
const cache = {
    async get(key) {
        if (!isConnected || !redis) return null;
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    async set(key, value, ttlSeconds = 300) {
        if (!isConnected || !redis) return;
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
        } catch {
            // Sessizce geç
        }
    },

    async del(key) {
        if (!isConnected || !redis) return;
        try {
            await redis.del(key);
        } catch {
            // Sessizce geç
        }
    },

    async flush() {
        if (!isConnected || !redis) return;
        try {
            await redis.flushdb();
        } catch {
            // Sessizce geç
        }
    },

    isAvailable() {
        return isConnected;
    },
};

module.exports = { connectRedis, cache, getRedis: () => redis };
