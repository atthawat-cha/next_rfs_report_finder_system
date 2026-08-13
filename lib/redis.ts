import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

const redis = globalForRedis.redis || new Redis(
  process.env.REDIS_URL ?? (() => { throw new Error("REDIS_URL is not set"); })()
);

redis.on('error', (err) => {
  console.error('[redis] connection error:', err);
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
