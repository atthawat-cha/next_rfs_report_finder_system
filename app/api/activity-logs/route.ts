import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { parsePagination } from '@/lib/pagination';

/**
 * GET /api/activity-logs
 * Filterable read-only audit trail — replaces the empty stub that used to sit
 * behind app/(auth)/user-management/activity/page.tsx (there was no endpoint
 * at all before this, see phase3-plan.md 3d audit).
 * Query params: user_id, entity, from/to (ISO date strings on created_at), page, pageSize
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
        const { page, pageSize, skip, take } = await parsePagination(searchParams);
        const userId = searchParams.get('user_id');
        const entity = searchParams.get('entity');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const where: Record<string, unknown> = {
            ...(userId && { user_id: userId }),
            ...(entity && { entity }),
            ...((from || to) && {
                created_at: {
                    ...(from && { gte: new Date(from) }),
                    ...(to && { lte: new Date(to) }),
                },
            }),
        };

        const [logs, total] = await Promise.all([
            prisma.activity_logs.findMany({
                where,
                include: {
                    users: { select: { id: true, username: true, first_name: true, last_name: true } },
                },
                orderBy: { created_at: 'desc' },
                skip,
                take,
            }),
            prisma.activity_logs.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: logs,
            meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
