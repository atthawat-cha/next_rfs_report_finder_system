import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { faker } from '@faker-js/faker';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-log';
import { resolveReportAcl } from '@/lib/report-acl';
import { logDevError } from '@/lib/log-dev-error';

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
        logDevError(error);
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

        // Admin tier bypasses the per-report ACL here for the same reason the
        // download/preview/detail routes do: GET /api/reports/[id] already hands
        // an admin `can_favorite: true`, so gating the write on resolveReportAcl
        // (which knows nothing about role tiers) would 403 a button the detail
        // page was told to enable. See 00-progress.md's ของค้าง #13. The report
        // has to be looked up explicitly on that path - resolveReportAcl's
        // DENY_ALL used to double as the "no such report" answer, and the upsert
        // below would otherwise fail on the FK with a 500 instead of a 403.
        const isAdmin = routeAcceptted('admin').includes(authResult.user.roles?.name?.toLowerCase() ?? '');
        if (isAdmin) {
            const report = await prisma.reports.findUnique({
                where: { id: validate.data.report_id },
                select: { id: true },
            });
            if (!report) {
                return NextResponse.json({ success: false, error: "Report not found or not favoritable" }, { status: 403 });
            }
        } else {
            const acl = await resolveReportAcl(validate.data.report_id, authResult.user);
            if (!acl.can_favorite) {
                return NextResponse.json({ success: false, error: "Report not found or not favoritable" }, { status: 403 });
            }
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
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
