/**
 * Runs once per server instance at startup (Next.js instrumentation hook),
 * before the server accepts requests. Phase 7a uses this to register the
 * in-process node-cron jobs that replace the old "admin has to remember to
 * click a button" flow for check-report-expiry/check-storage.
 *
 * Guarded to the Node runtime: this file's `register()` also runs in the
 * Edge compilation pass, and node-cron/pino cannot be bundled there - see
 * lib/logger.ts's header comment for the same Edge-runtime constraint.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startScheduledJobs } = await import('@/lib/jobs/scheduler');
        startScheduledJobs();
    }
}
