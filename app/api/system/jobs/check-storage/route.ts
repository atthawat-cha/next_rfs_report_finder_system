import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';
import { runCheckStorage } from '@/lib/jobs/checkStorage';

/**
 * POST /api/system/jobs/check-storage
 * Manually-invokable admin trigger for the same job the in-process
 * node-cron scheduler (`lib/jobs/scheduler.ts`, Phase 7a) now also runs
 * hourly - both paths call `runCheckStorage` so the logic only exists once.
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const user = await getCurrentUser();
        const data = await runCheckStorage(req, user?.id ?? null);

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
