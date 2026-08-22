import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { logActivity } from '@/lib/activity-log';

/**
 * Core logic for the "check-expired-shares" job (Phase 8b) - same shape as
 * `checkReportExpiry.ts`/`checkStorage.ts`. `check-report-expiry` only warns
 * *before* a share expires (`expiry_notified_at`); nothing previously
 * cleaned up rows already past `expires_at`. `report_shares` has no
 * `is_active`/`revoked` column, so "cleanup" means a real delete - there is
 * no foreign key pointing at a `report_shares` row from elsewhere, so this
 * is schema-safe. After this runs, `GET /api/reports/[id]/shares` stops
 * listing the deleted rows, and `GET /api/shares/[token]` for a deleted
 * token starts returning 404 instead of 410 (same deny outcome).
 */
export async function runCheckExpiredShares(req: NextRequest, triggeredByUserId: string | null) {
    const { count } = await prisma.report_shares.deleteMany({
        where: { expires_at: { not: null, lt: new Date() } },
    });

    await logActivity(req, {
        userId: triggeredByUserId,
        action: 'delete',
        entity: 'system',
        description: `check-expired-shares job: deleted ${count} expired share(s)`,
    });

    return { deleted: count };
}
