import pino from "pino";

/**
 * Structured logger (Phase 4f). Pretty-printed in development, plain JSON in
 * production so log-aggregation tooling gets parseable lines if one is ever
 * added.
 *
 * Node-runtime only - do NOT import this from middleware.ts or anything it
 * pulls in (lib/auth.ts). middleware.ts runs on the Edge runtime, which
 * can't bundle pino's worker-thread-based transports, the same reason
 * lib/rate-limit.ts (ioredis) is kept out of lib/auth.ts.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } },
});

export default logger;
