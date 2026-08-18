import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { createNotification } from '@/lib/notifications';

const EXPIRY_WARNING_DAYS = 3;

/**
 * POST /api/system/jobs/check-report-expiry
 * Phase 4e — no cron exists in this repo, so this is a manually-invokable
 * hook meant to be wired to whatever external scheduler the deploy
 * environment has (Windows Task Scheduler / cron / etc.), not something
 * this app triggers itself. De-duped via `report_shares.expiry_notified_at`
 * so re-running this endpoint never double-notifies the same share.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

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

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'system',
            description: `check-report-expiry job: notified ${expiringShares.length} share(s)`,
        });

        return NextResponse.json({ success: true, data: { notified: expiringShares.length } }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
