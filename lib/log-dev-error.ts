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
 */
export function logDevError(error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.log(error);
    return;
  }
  logger.error({ error }, "route handler error");
}
