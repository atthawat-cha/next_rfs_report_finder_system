import redis from './redis';

// ─────────────────────────────────────────────
// RATE LIMITING HELPER (OWASP A07 - brute-force)
// ─────────────────────────────────────────────
// Kept out of lib/auth.ts on purpose: middleware.ts (Edge runtime) imports
// getAuthFromRequest from lib/auth.ts, and ioredis cannot be bundled for Edge.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (!identifier) return { allowed: false };
  const key = `ratelimit:login:${identifier}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.pexpire(key, WINDOW_MS);
    if (count > MAX_ATTEMPTS) {
      const ttl = await redis.pttl(key);
      return { allowed: false, retryAfter: Math.max(0, Math.ceil(ttl / 1000)) };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[rateLimit] redis error, failing open:', err);
    return { allowed: true }; // fail-open: rate limiting is defense-in-depth, not the primary auth boundary
  }
}

export async function resetRateLimit(identifier: string): Promise<void> {
  try {
    await redis.del(`ratelimit:login:${identifier}`);
  } catch (err) {
    console.error('[rateLimit] redis error on reset:', err);
  }
}

export async function rateLimit(identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  return checkRateLimit(identifier);
}
