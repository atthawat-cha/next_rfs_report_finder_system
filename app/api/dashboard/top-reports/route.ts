import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logDevError } from '@/lib/log-dev-error';
import { withCache } from '@/lib/cache';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const CACHE_TTL_SECONDS = 60;

/**
 * GET /api/dashboard/top-reports?limit=10
 * Ranked by download_count (real signal). favorite_count is attached as a
 * secondary metric, not used for ranking — `view_count` is a weaker signal
 * for "most useful report" than an explicit download/favorite action, not
 * because it's untracked (it has been incremented by `GET /api/reports/[id]`
 * since Phase 4c). Phase 7c added a short Redis cache, fail-open like the
 * rest of /api/dashboard/*.
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

        let limit = Number(req.nextUrl.searchParams.get('limit'));
        if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
        limit = Math.min(limit, MAX_LIMIT);

        const data = await withCache(`dashboard:top-reports:${limit}`, CACHE_TTL_SECONDS, () =>
            computeTopReports(limit)
        );

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function computeTopReports(limit: number) {
    const reports = await prisma.reports.findMany({
        orderBy: { download_count: 'desc' },
        take: limit,
        select: {
            id: true,
            code: true,
            name_th: true,
            name_en: true,
            download_count: true,
            categories: { select: { id: true, name: true } },
        },
    });

    const reportIds = reports.map((r) => r.id);
    const favoriteCounts = reportIds.length
        ? await prisma.favorites.groupBy({
            by: ['report_id'],
            where: { report_id: { in: reportIds } },
            _count: { _all: true },
        })
        : [];
    const favoriteCountById = new Map(favoriteCounts.map((f) => [f.report_id, f._count._all]));

    return reports.map((r) => ({
        id: r.id,
        code: r.code,
        name_th: r.name_th,
        name_en: r.name_en,
        category_name: r.categories?.name ?? null,
        download_count: r.download_count,
        favorite_count: favoriteCountById.get(r.id) ?? 0,
    }));
}
