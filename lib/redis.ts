import Redis from 'ioredis';
import logger from './logger';

const globalForRedis = global as unknown as { redis: Redis };

const redis = globalForRedis.redis || new Redis(
  process.env.REDIS_URL ?? (() => { throw new Error("REDIS_URL is not set"); })(),
  { maxRetriesPerRequest: 1 } // fail fast so the rate-limiter's fail-open path doesn't hang the request when Redis is down
);

redis.on('error', (err) => {
  logger.error({ err }, '[redis] connection error');
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
