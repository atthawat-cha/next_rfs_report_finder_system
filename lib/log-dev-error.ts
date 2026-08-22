/**
 * Replaces the `process.env.NODE_ENV === 'development' && console.log(error)`
 * idiom repeated across every route handler's catch block (38 files, 60
 * occurrences as of Phase 6c) with one call. Behaviour is identical - log to
 * the console in development, silent otherwise - this is a lint-hygiene seam
 * (`no-unused-expressions` flags the `&&`-as-statement form), not a logging
 * upgrade. Wiring this to lib/logger.ts's pino instance is a deliberate later
 * decision, not made here - see 00-progress.md's Phase 4f notes on why
 * lib/auth.ts (and by extension anything on the Edge runtime) stays off pino.
 */
export function logDevError(error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.log(error);
  }
}
