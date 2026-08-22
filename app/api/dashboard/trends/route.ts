import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

/**
 * GET /api/dashboard/trends?days=30
 * Daily download counts (real signal — view_count is never incremented anywhere
 * in the app, see phase3-plan.md 3d audit). Missing days are zero-filled in JS
 * rather than generate_series in SQL — the window is small enough that it's not
 * worth the extra query complexity.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        let days = Number(req.nextUrl.searchParams.get('days'));
        if (!Number.isFinite(days) || days < 1) days = DEFAULT_DAYS;
        days = Math.min(days, MAX_DAYS);

        const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
            SELECT date_trunc('day', created_at) AS day, COUNT(*)::bigint AS count
            FROM downloads
            WHERE created_at >= now() - (${days}::text || ' days')::interval
            GROUP BY day
            ORDER BY day ASC
        `;

        const countByDay = new Map<string, number>();
        for (const row of rows) {
            countByDay.set(row.day.toISOString().slice(0, 10), Number(row.count));
        }

        const series: { date: string; count: number }[] = [];
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setUTCDate(d.getUTCDate() - i);
            const key = d.toISOString().slice(0, 10);
            series.push({ date: key, count: countByDay.get(key) ?? 0 });
        }

        return NextResponse.json({ success: true, data: series }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
