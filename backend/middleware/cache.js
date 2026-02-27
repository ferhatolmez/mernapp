const { cache } = require('../config/redis');

/**
 * Cache middleware — route seviyesinde önbellekleme
 * @param {number} ttl — Cache süresi (saniye), varsayılan 300 (5 dk)
 */
const cacheMiddleware = (ttl = 300) => {
    return async (req, res, next) => {
        if (!cache.isAvailable() || req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;

        try {
            const cached = await cache.get(key);
            if (cached) {
                return res.json(cached);
            }
        } catch {
            return next();
        }

        // Response'u yakala ve cache'le
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode === 200) {
                cache.set(key, body, ttl).catch(() => { });
            }
            return originalJson(body);
        };

        next();
    };
};

module.exports = cacheMiddleware;
