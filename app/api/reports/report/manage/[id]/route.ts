import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

/**
 * GET /api/reports/report/manage/[id] — single report + current files, for
 * preloading the edit page.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const report = await prisma.reports.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                code: true,
                name_th: true,
                name_en: true,
                description: true,
                category_id: true,
                department_id: true,
                status: true,
                access_level: true,
                output_type: true,
                is_downloadable: true,
                is_editable: true,
                file_path: true,
                file_name: true,
                created_at: true,
                updated_at: true,
                report_files: { where: { is_current: true } },
            },
        });

        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        // report_files.file_size is BigInt — JSON.stringify can't serialize it directly
        const data = {
            ...report,
            report_files: report.report_files.map((f) => ({ ...f, file_size: Number(f.file_size) })),
        };

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const updateZod = z.object({
    code: z.string().min(1).optional(),
    name_th: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    category_id: z.string().min(1).optional(),
    department_id: z.string().min(1).optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    access_level: z.enum(['PUBLIC', 'RESTRICTED', 'PRIVATE']).optional(),
    is_downloadable: z.boolean().optional(),
    is_editable: z.boolean().optional(),
});

/**
 * PUT /api/reports/report/manage/[id] — update report metadata only.
 * Files are managed separately via /api/reports/[id]/files; output_type is
 * immutable after creation (system-design.md §3.9) and not accepted here.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.reports.findUnique({ where: { id: params.id }, select: { id: true } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }

        const report = await prisma.reports.update({
            where: { id: params.id },
            data: { ...validate.data, updated_at: new Date() },
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'update',
            entity: 'report',
            entityId: report.id,
            description: `Updated report ${report.code}`,
        });

        return NextResponse.json({ success: true, data: { id: report.id } }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/report/manage/[id] — cascades to report_files/
 * report_queries/report_variables/report_permissions/favorites/downloads/etc
 * via onDelete: Cascade already declared in schema.prisma.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.reports.findUnique({ where: { id: params.id }, select: { id: true, code: true } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        await prisma.reports.delete({ where: { id: params.id } });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'delete',
            entity: 'report',
            entityId: existing.id,
            description: `Deleted report ${existing.code}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
