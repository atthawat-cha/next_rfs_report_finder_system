import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { parsePagination } from '@/lib/pagination';
import { visibleReportIdsFor } from '@/lib/report-acl';
import { logDevError } from '@/lib/log-dev-error';

const SIMILARITY_THRESHOLD = 0.3;

/**
 * GET /api/reports/browse
 * Non-admin report list — filtered via lib/report-acl.ts's visibleReportIdsFor
 * (individual grant > role grant > access_level fallback).
 * Query params: q, category, department, tag, page, pageSize
 */
export async function GET(req: NextRequest) {
    try {
        const acceptedRoles = routeAcceptted('user');
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, acceptedRoles);
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const searchParams = req.nextUrl.searchParams;
        const { page, pageSize, skip, take } = await parsePagination(searchParams);
        const q = searchParams.get('q')?.trim();
        const category = searchParams.get('category');
        const department = searchParams.get('department');
        const tag = searchParams.get('tag');

        const visibleIds = await visibleReportIdsFor(authResult.user);
        if (visibleIds.length === 0) {
            return NextResponse.json(
                { success: true, data: [], meta: { page, pageSize, total: 0, totalPages: 0 } },
                { status: 200 }
            );
        }

        const where: Record<string, unknown> = {
            id: { in: visibleIds },
            ...(category && { category_id: category }),
            ...(department && { department_id: department }),
            ...(tag && { report_tags: { some: { tags: { slug: tag } } } }),
        };

        let pagedIds: string[] | null = null;
        let total: number | undefined;

        if (q) {
            // tsvector handles efficient whole-word/prefix matches; trigram ILIKE covers
            // substring matches inside unsegmented Thai compound words (see migration note).
            // similarity() (pg_trgm) additionally catches typos/near-misses that neither of
            // those cover - the trigram GIN indexes on name_th/name_en/code (schema.prisma)
            // already support it, no new migration needed (Phase 7d).
            const likeTerm = `%${q}%`;
            const rankedRows = await prisma.$queryRaw<{ id: string; rank: number }[]>`
                SELECT id,
                    GREATEST(
                        similarity(name_th, ${q}),
                        similarity(coalesce(name_en, ''), ${q}),
                        similarity(code, ${q}),
                        CASE WHEN search_vector @@ to_tsquery('simple', ${toTsQueryInput(q)}) THEN 1 ELSE 0 END
                    ) AS rank
                FROM reports
                WHERE id = ANY(${visibleIds})
                  AND (
                    search_vector @@ to_tsquery('simple', ${toTsQueryInput(q)})
                    OR name_th ILIKE ${likeTerm}
                    OR name_en ILIKE ${likeTerm}
                    OR code ILIKE ${likeTerm}
                    OR similarity(name_th, ${q}) > ${SIMILARITY_THRESHOLD}
                    OR similarity(coalesce(name_en, ''), ${q}) > ${SIMILARITY_THRESHOLD}
                    OR similarity(code, ${q}) > ${SIMILARITY_THRESHOLD}
                  )
                ORDER BY rank DESC
            `;

            if (rankedRows.length === 0) {
                return NextResponse.json(
                    { success: true, data: [], meta: { page, pageSize, total: 0, totalPages: 0 } },
                    { status: 200 }
                );
            }

            // Rank has to be decided (and paginated) here, in SQL order - Prisma's
            // findMany below has no way to sort by this computed rank, only by real
            // columns, so slicing the already-ranked id list is what makes page 2 of a
            // search still return the 2nd-best matches instead of an arbitrary slice.
            total = rankedRows.length;
            pagedIds = rankedRows.slice(skip, skip + take).map((r) => r.id);
            where.id = { in: pagedIds };
        }

        const reportRows = await prisma.reports.findMany({
            where,
            select: {
                id: true,
                code: true,
                name_th: true,
                name_en: true,
                description: true,
                file_path: true,
                file_name: true,
                access_level: true,
                is_downloadable: true,
                is_editable: true,
                categories: { select: { id: true, name: true } },
                departments: { select: { id: true, name: true } },
                report_tags: { select: { tags: { select: { id: true, name: true, slug: true } } } },
                created_at: true,
                status: true,
                updated_at: true,
            },
            ...(pagedIds ? {} : { skip, take, orderBy: { created_at: 'desc' } }),
        });

        // findMany's `where.id: {in: pagedIds}` does not preserve pagedIds' order,
        // so re-apply the rank order it was sliced in above.
        let reports = reportRows;
        if (pagedIds) {
            const rowById = new Map(reportRows.map((r) => [r.id, r]));
            reports = pagedIds.map((id) => rowById.get(id)).filter((r) => r !== undefined) as typeof reportRows;
        }

        if (total === undefined) {
            total = await prisma.reports.count({ where });
        }

        return NextResponse.json(
            { success: true, data: reports, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
            { status: 200 }
        );
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/** Turn free-text query into a to_tsquery-safe AND-of-prefix-terms expression. */
function toTsQueryInput(q: string): string {
    return q
        .split(/\s+/)
        .filter(Boolean)
        .map((term) => term.replace(/['&|!():]/g, '') + ':*')
        .join(' & ');
}
