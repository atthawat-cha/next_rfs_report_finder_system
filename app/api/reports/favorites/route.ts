import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { faker } from '@faker-js/faker';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-log';
import { isReportVisibleToNonAdmin } from '@/lib/report-visibility';

/**
 * GET /api/reports/favorites — list current user's favorite reports
 */
export async function GET(req: NextRequest) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const favorites = await prisma.favorites.findMany({
            where: { user_id: authResult.user.id },
            select: {
                reports: {
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
                        created_at: true,
                        status: true,
                        updated_at: true,
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        return NextResponse.json({ success: true, data: favorites.map((f) => f.reports) }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const favoriteZod = z.object({
    report_id: z.string().min(1, "report_id is required"),
});

/**
 * POST /api/reports/favorites { report_id } — add a favorite
 */
export async function POST(req: NextRequest) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const body = await req.json();
        const validate = favoriteZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }

        // Phase 1 can_favorite rule: only reports visible under the coarse non-admin
        // visibility rule can be favorited (see lib/report-visibility.ts)
        const visible = await isReportVisibleToNonAdmin(validate.data.report_id);
        if (!visible) {
            return NextResponse.json({ success: false, error: "Report not found or not favoritable" }, { status: 403 });
        }

        const favorite = await prisma.favorites.upsert({
            where: {
                user_id_report_id: {
                    user_id: authResult.user.id,
                    report_id: validate.data.report_id,
                },
            },
            create: {
                id: faker.string.uuid(),
                user_id: authResult.user.id,
                report_id: validate.data.report_id,
            },
            update: {},
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'favorite',
            entity: 'report',
            entityId: validate.data.report_id,
            description: `Favorited report ${validate.data.report_id}`,
        });

        return NextResponse.json({ success: true, data: { id: favorite.id } }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
