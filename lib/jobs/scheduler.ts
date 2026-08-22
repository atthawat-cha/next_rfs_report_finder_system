import cron from 'node-cron';
import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { runCheckReportExpiry } from '@/lib/jobs/checkReportExpiry';
import { runCheckStorage } from '@/lib/jobs/checkStorage';

/**
 * In-process job scheduler (Phase 7a) - registered from `instrumentation.ts`
 * at server startup. Node-runtime only (pulls in pino via lib/logger.ts, same
 * constraint as lib/log-dev-error.ts).
 *
 * `logActivity` requires a NextRequest for IP/user-agent fields; there is no
 * real request here, so a synthetic one is passed - `getClientIp` already
 * falls back to 'unknown' when the expected headers are absent, which is the
 * correct shape for a system-triggered run (userId is also `null`, not an
 * admin's id).
 */
const globalForScheduler = globalThis as unknown as { __rfsSchedulerStarted?: boolean };

function syntheticRequest(path: string): NextRequest {
    return new NextRequest(`http://localhost${path}`, {
        headers: { 'user-agent': 'node-cron-scheduler' },
    });
}

export function startScheduledJobs(): void {
    if (globalForScheduler.__rfsSchedulerStarted) return;
    globalForScheduler.__rfsSchedulerStarted = true;

    cron.schedule(
        '0 2 * * *',
        async () => {
            try {
                const result = await runCheckReportExpiry(syntheticRequest('/internal/jobs/check-report-expiry'), null);
                logger.info({ result }, 'scheduled check-report-expiry completed');
            } catch (error) {
                logger.error({ error }, 'scheduled check-report-expiry failed');
            }
        },
        { name: 'check-report-expiry' }
    );

    cron.schedule(
        '0 * * * *',
        async () => {
            try {
                const result = await runCheckStorage(syntheticRequest('/internal/jobs/check-storage'), null);
                logger.info({ result }, 'scheduled check-storage completed');
            } catch (error) {
                logger.error({ error }, 'scheduled check-storage failed');
            }
        },
        { name: 'check-storage' }
    );

    logger.info('scheduled jobs registered (check-report-expiry daily 02:00, check-storage hourly)');
}
