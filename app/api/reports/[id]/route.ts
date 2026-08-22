import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, routeAcceptted } from '@/lib/auth';
import { resolveReportAcl } from '@/lib/report-acl';
import { logActivity } from '@/lib/activity-log';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/reports/[id] — single-report detail for any authenticated role.
 * Non-admin visibility gated by lib/report-acl.ts (404, not 403, to avoid
 * confirming a restricted report's existence — same pattern as download/
 * favorites). Admin bypasses ACL entirely. Increments view_count (the first
 * real write to that column - it's been dead since it was added) and logs
 * a 'view' activity.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const isAdmin = routeAcceptted('admin').includes(authResult.user.roles?.name?.toLowerCase() ?? '');

        const report = await prisma.reports.findUnique({
            where: { id: params.id },
            include: {
                categories: { select: { id: true, name: true } },
                departments: { select: { id: true, name: true } },
                report_files: { where: { is_current: true }, orderBy: { file_kind: 'asc' } },
            },
        });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        const acl = isAdmin
            ? { can_view: true, can_edit: true, can_delete: true, can_favorite: true, can_export: true, can_print: true }
            : await resolveReportAcl(params.id, authResult.user);

        if (!acl.can_view) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        await prisma.reports.update({
            where: { id: params.id },
            data: { view_count: { increment: 1 } },
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'view',
            entity: 'report',
            entityId: report.id,
            description: `Viewed report ${report.code}`,
        });

        const { report_files, ...reportFields } = report;
        const files = report_files.map((f) => ({ ...f, file_size: Number(f.file_size) }));

        return NextResponse.json(
            { success: true, data: { ...reportFields, file_size: Number(reportFields.file_size), files, acl } },
            { status: 200 }
        );
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
