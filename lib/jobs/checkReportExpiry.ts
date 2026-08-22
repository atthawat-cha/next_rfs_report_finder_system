import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';

const EXPIRY_WARNING_DAYS = 3;

/**
 * Core logic for the "check-report-expiry" job, extracted from
 * `app/api/system/jobs/check-report-expiry/route.ts` (Phase 7a) so the
 * in-process node-cron scheduler (`lib/jobs/scheduler.ts`) can call it
 * directly, without going through the HTTP+auth layer the route handler
 * still uses for its manually-invokable admin path. De-duped via
 * `report_shares.expiry_notified_at` so running this twice never
 * double-notifies the same share.
 */
export async function runCheckReportExpiry(req: NextRequest, triggeredByUserId: string | null) {
    const windowEnd = new Date(Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);

    const expiringShares = await prisma.report_shares.findMany({
        where: {
            expires_at: { gt: new Date(), lte: windowEnd },
            expiry_notified_at: null,
        },
        include: { reports: { select: { name_th: true } } },
    });

    await Promise.all(
        expiringShares.map((share) =>
            createNotification(
                share.shared_by,
                'REPORT_EXPIRING',
                'ลิงก์แชร์รายงานใกล้หมดอายุ',
                `การแชร์รายงาน "${share.reports.name_th}" จะหมดอายุในไม่ช้า`
            )
        )
    );

    if (expiringShares.length > 0) {
        await prisma.report_shares.updateMany({
            where: { id: { in: expiringShares.map((s) => s.id) } },
            data: { expiry_notified_at: new Date() },
        });
    }

    await logActivity(req, {
        userId: triggeredByUserId,
        action: 'update',
        entity: 'system',
        description: `check-report-expiry job: notified ${expiringShares.length} share(s)`,
    });

    return { notified: expiringShares.length };
}
