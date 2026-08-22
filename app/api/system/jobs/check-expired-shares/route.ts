import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';
import { runCheckExpiredShares } from '@/lib/jobs/checkExpiredShares';

/**
 * POST /api/system/jobs/check-expired-shares
 * Manually-invokable admin trigger for the same job the in-process
 * node-cron scheduler (`lib/jobs/scheduler.ts`) also runs on a schedule -
 * both paths call `runCheckExpiredShares` so the logic only exists once.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const user = await getCurrentUser();
        const data = await runCheckExpiredShares(req, user?.id ?? null);

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
