import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';
import { withCache } from '@/lib/cache';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;
const DEFAULT_MONTHS = 12;
const MAX_MONTHS = 24;
const CACHE_TTL_SECONDS = 60;

type Granularity = 'day' | 'month';

/**
 * GET /api/dashboard/trends?days=30&granularity=day|month
 * Daily (or monthly) download counts (real signal — `view_count` IS now
 * incremented, by `GET /api/reports/[id]` since Phase 4c, but downloads stay
 * the metric here since that's what this endpoint has always tracked).
 * Missing periods are zero-filled in JS rather than generate_series in SQL —
 * the window is small enough that it's not worth the extra query complexity.
 * Phase 7c added `granularity` (default `day`, unchanged) and a short
 * Redis cache (fail-open, same stance as lib/rate-limit.ts).
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

        const searchParams = req.nextUrl.searchParams;
        const granularity: Granularity = searchParams.get('granularity') === 'month' ? 'month' : 'day';

        if (granularity === 'month') {
            let months = Number(searchParams.get('days'));
            if (!Number.isFinite(months) || months < 1) months = DEFAULT_MONTHS;
            months = Math.min(months, MAX_MONTHS);

            const data = await withCache(`dashboard:trends:month:${months}`, CACHE_TTL_SECONDS, () =>
                getMonthlyTrend(months)
            );
            return NextResponse.json({ success: true, data }, { status: 200 });
        }

        let days = Number(searchParams.get('days'));
        if (!Number.isFinite(days) || days < 1) days = DEFAULT_DAYS;
        days = Math.min(days, MAX_DAYS);

        const data = await withCache(`dashboard:trends:day:${days}`, CACHE_TTL_SECONDS, () => getDailyTrend(days));
        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function getDailyTrend(days: number) {
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
    return series;
}

async function getMonthlyTrend(months: number) {
    const rows = await prisma.$queryRaw<{ month: Date; count: bigint }[]>`
        SELECT date_trunc('month', created_at) AS month, COUNT(*)::bigint AS count
        FROM downloads
        WHERE created_at >= now() - (${months}::text || ' months')::interval
        GROUP BY month
        ORDER BY month ASC
    `;

    const countByMonth = new Map<string, number>();
    for (const row of rows) {
        countByMonth.set(row.month.toISOString().slice(0, 7), Number(row.count));
    }

    const series: { date: string; count: number }[] = [];
    const cursor = new Date();
    cursor.setUTCDate(1);
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(cursor);
        d.setUTCMonth(d.getUTCMonth() - i);
        const key = d.toISOString().slice(0, 7);
        series.push({ date: key, count: countByMonth.get(key) ?? 0 });
    }
    return series;
}
