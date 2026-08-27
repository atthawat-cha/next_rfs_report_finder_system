import * as Sentry from "@sentry/nextjs";
import logger from "@/lib/logger";

/**
 * Replaces the `process.env.NODE_ENV === 'development' && console.log(error)`
 * idiom repeated across every route handler's catch block. In development,
 * behaviour is unchanged - log to the console. Outside development (where the
 * old idiom was silent), Phase 7a wires this to lib/logger.ts's pino instance
 * instead of doing nothing, since every call site here is an
 * `app/api/**\/route.ts` handler (Node runtime). As of Phase 8, `proxy.ts`
 * (formerly `middleware.ts`) also runs on Node, so this restriction is no
 * longer about runtime compatibility - it's just that logDevError() has
 * never had a reason to be called from there.
 *
 * Phase 12c adds Sentry.captureException alongside the existing logger call
 * - this alone covers all existing call sites with no other file needing to
 * change. Safe to call unconditionally: without a configured DSN, Sentry has
 * no client to send to, so this is a no-op (see instrumentation.ts, the only
 * place Sentry.init actually runs).
 */
export function logDevError(error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.log(error);
    return;
  }
  logger.error({ error }, "route handler error");
  Sentry.captureException(error);
}
