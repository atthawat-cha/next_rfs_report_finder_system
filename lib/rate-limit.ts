import redis from './redis';
import logger from './logger';

// ─────────────────────────────────────────────
// RATE LIMITING HELPER (OWASP A07 - brute-force)
// ─────────────────────────────────────────────
// Kept out of lib/auth.ts on purpose: proxy.ts imports getAuthFromRequest
// from lib/auth.ts. Historically this had to stay separate because
// middleware.ts (proxy.ts's pre-Phase-8 name) ran on the Edge runtime,
// which couldn't bundle ioredis - as of Phase 8, proxy.ts runs on Node
// (Next.js 16's Proxy defaults to it, with no way to opt back into Edge),
// so that specific constraint no longer applies. The separation stays
// anyway: lib/auth.ts is imported by other Node-runtime call sites that
// don't need rate limiting, so this isn't a hard requirement anymore, just
// a deliberate choice to keep lib/auth.ts's dependency surface small.

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
    logger.error({ err }, '[rateLimit] redis error, failing open');
    return { allowed: true }; // fail-open: rate limiting is defense-in-depth, not the primary auth boundary
  }
}

export async function resetRateLimit(identifier: string): Promise<void> {
  try {
    await redis.del(`ratelimit:login:${identifier}`);
  } catch (err) {
    logger.error({ err }, '[rateLimit] redis error on reset');
  }
}

export async function rateLimit(identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  return checkRateLimit(identifier);
}
