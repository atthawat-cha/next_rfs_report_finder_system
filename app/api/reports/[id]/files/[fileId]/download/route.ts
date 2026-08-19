import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { getClientIp } from '@/lib/request-info';
import { resolveReportAcl } from '@/lib/report-acl';
import { resolveStoredFile } from '@/lib/storage-path';
import { faker } from '@faker-js/faker';

const MIME_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
};

/**
 * GET /api/reports/[id]/files/[fileId]/download — download one specific
 * report_files row by id, not just the report's cached primary file. Same
 * auth/ACL/side-effects as GET /api/reports/[id]/download (this is that
 * endpoint's per-file_kind sibling, added because report_files rows other
 * than the primary - e.g. SAMPLE_FILLED_FORM on a PRINT_FORM report - had no
 * user-facing download path at all).
 */
export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string; fileId: string }> }
) {
    const params = await props.params;
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const isAdmin = routeAcceptted('admin').includes(authResult.user.roles?.name?.toLowerCase() ?? '');

        const report = await prisma.reports.findUnique({
            where: { id: params.id },
            select: { id: true, code: true, is_downloadable: true },
        });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        if (!isAdmin) {
            const acl = await resolveReportAcl(params.id, authResult.user);
            if (!acl.can_export) {
                return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
            }
        }

        if (!report.is_downloadable) {
            return NextResponse.json({ success: false, error: "This report is not downloadable" }, { status: 403 });
        }

        // Only the current version is reachable through this general-purpose path -
        // historical versions stay admin-only via the existing version-history UI.
        const file = await prisma.report_files.findFirst({
            where: { id: params.fileId, report_id: params.id, is_current: true },
        });
        if (!file) {
            return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
        }

        let fileBuffer: Buffer;
        try {
            const absolutePath = await resolveStoredFile(file.file_path);
            fileBuffer = await fs.readFile(absolutePath);
        } catch {
            return NextResponse.json({ success: false, error: "File not found on server" }, { status: 404 });
        }

        await prisma.reports.update({
            where: { id: params.id },
            data: { download_count: { increment: 1 } },
        });

        await prisma.downloads.create({
            data: {
                id: faker.string.uuid(),
                user_id: authResult.user.id,
                report_id: params.id,
                ip_address: getClientIp(req),
                user_agent: req.headers.get('user-agent') ?? '',
            },
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'download',
            entity: 'report',
            entityId: params.id,
            description: `Downloaded ${file.file_kind} for report ${report.code}`,
        });

        const ext = path.extname(file.file_name || file.file_path).replace('.', '').toLowerCase();
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `inline; filename="${encodeURIComponent(file.file_name || 'download')}"`,
            },
        });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
