import * as Sentry from '@sentry/nextjs';

/**
 * Runs once per server instance at startup (Next.js instrumentation hook),
 * before the server accepts requests. Phase 7a uses this to register the
 * in-process node-cron jobs that replace the old "admin has to remember to
 * click a button" flow for check-report-expiry/check-storage.
 *
 * Guarded to the Node runtime: this file's `register()` also runs in the
 * Edge compilation pass, and node-cron/pino cannot be bundled there - see
 * lib/logger.ts's header comment for the same Edge-runtime constraint.
 *
 * Phase 12c adds Sentry server/edge init here (the current single-file
 * convention - `@sentry/nextjs` no longer ships separate
 * sentry.server.config.ts/sentry.edge.config.ts). Only runs when SENTRY_DSN
 * is set - unset (today's real state) means no Sentry.init() call at all,
 * so zero SDK network activity.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startScheduledJobs } = await import('@/lib/jobs/scheduler');
        startScheduledJobs();
    }

    if (process.env.SENTRY_DSN) {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            tracesSampleRate: 0,
        });
    }
}

// Reports server-side rendering/route-handler errors to Sentry (see
// captureException wiring in lib/log-dev-error.ts for the other 61 call
// sites). Only exported as a real function when SENTRY_DSN is set, per the
// same "no SDK activity when unset" rule as register() above.
export const onRequestError = process.env.SENTRY_DSN ? Sentry.captureRequestError : undefined;
