import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { getClientIp } from '@/lib/request-info';
import { faker } from '@faker-js/faker';

const PUBLIC_DIR = path.join(process.cwd(), 'public');

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
 * GET /api/reports/[id]/download
 * Checks visibility + is_downloadable, streams the file through the server
 * (never a direct static link) so the ACL check + downloads log always happen first.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, routeAcceptted('user'));
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { id } = params;
        const isAdmin = routeAcceptted('admin').includes(authResult.user.roles?.name?.toLowerCase() ?? '');

        const report = await prisma.reports.findUnique({
            where: { id },
            select: {
                id: true,
                code: true,
                file_path: true,
                file_name: true,
                is_downloadable: true,
                status: true,
                access_level: true,
            },
        });

        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        if (!isAdmin && (report.status !== 'PUBLISHED' || report.access_level !== 'PUBLIC')) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        if (!report.is_downloadable) {
            return NextResponse.json({ success: false, error: "This report is not downloadable" }, { status: 403 });
        }

        const absolutePath = path.join(PUBLIC_DIR, report.file_path);
        let fileBuffer: Buffer;
        try {
            fileBuffer = await fs.readFile(absolutePath);
        } catch {
            return NextResponse.json({ success: false, error: "File not found on server" }, { status: 404 });
        }

        // Atomic increment — avoid read-modify-write races under concurrent downloads
        await prisma.reports.update({
            where: { id },
            data: { download_count: { increment: 1 } },
        });

        await prisma.downloads.create({
            data: {
                id: faker.string.uuid(),
                user_id: authResult.user.id,
                report_id: id,
                ip_address: getClientIp(req),
                user_agent: req.headers.get('user-agent') ?? '',
            },
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'download',
            entity: 'report',
            entityId: id,
            description: `Downloaded report ${report.code}`,
        });

        const ext = path.extname(report.file_name || report.file_path).replace('.', '').toLowerCase();
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(report.file_name || 'download')}"`,
            },
        });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
