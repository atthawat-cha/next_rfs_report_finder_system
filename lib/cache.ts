import redis from '@/lib/redis';
import logger from '@/lib/logger';

/**
 * Generic cache-aside helper over Redis (Phase 7c, first real consumer:
 * app/api/dashboard/*). Fail-open on every Redis error, same stance as
 * lib/rate-limit.ts and for the same reason - caching is a performance
 * optimization, not a correctness boundary, so a Redis outage must fall
 * through to the live `compute()` rather than break the caller.
 */
export async function withCache<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    try {
        const cached = await redis.get(key);
        if (cached !== null) {
            return JSON.parse(cached) as T;
        }
    } catch (err) {
        logger.error({ err, key }, '[cache] redis read failed, falling through to live query');
    }

    const result = await compute();

    try {
        await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
    } catch (err) {
        logger.error({ err, key }, '[cache] redis write failed');
    }

    return result;
}
