import pino from "pino";

/**
 * Structured logger (Phase 4f). Plain JSON in both dev and production.
 *
 * Deliberately NOT using pino-pretty's transport in dev (tried it originally -
 * see 00-progress.md ของค้าง #7): pino spawns its transport's worker thread at
 * module-import time, not on first `.error()` call, so every route that
 * (transitively, via lib/activity-log.ts) imports this module pays the cost
 * immediately on load. Under Next.js 15's dev-mode child-process-per-route
 * compilation, a worker-thread MODULE_NOT_FOUND here (a real, reproducible
 * Windows + Next dev bundler interaction, not flaky) throws uncaught inside
 * that child process and kills it outright - which surfaced as real 500s on
 * whichever route happened to be the first compiled fresh in a given child
 * process, not just noisy dev logs like it was under Next 14's dev
 * architecture. Plain JSON output has no transport, so no worker thread ever
 * spawns - trades away colorized dev log output for routes that don't 500.
 *
 * Node-runtime only - as of Phase 8, `proxy.ts` (formerly `middleware.ts`)
 * actually runs on Node (Next.js 16's Proxy defaults to it, with no way to
 * opt back into Edge), so importing this from there would technically work
 * now. It's still kept out of `lib/auth.ts` on purpose: that file is
 * imported by other Node-runtime call sites that don't need pino, so the
 * separation stays as a deliberate choice, not an enforced one - same
 * reasoning as lib/rate-limit.ts's ioredis usage.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
});

export default logger;
