import logger from "@/lib/logger";

/**
 * Replaces the `process.env.NODE_ENV === 'development' && console.log(error)`
 * idiom repeated across every route handler's catch block. In development,
 * behaviour is unchanged - log to the console. Outside development (where the
 * old idiom was silent), Phase 7a wires this to lib/logger.ts's pino instance
 * instead of doing nothing, since every call site here is an
 * `app/api/**\/route.ts` handler (Node runtime) - never middleware.ts or
 * anything it pulls in, which is what has to stay off pino (Edge runtime).
 */
export function logDevError(error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.log(error);
    return;
  }
  logger.error({ error }, "route handler error");
}
