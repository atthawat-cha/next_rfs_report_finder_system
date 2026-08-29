import path from 'path';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { resolveReportAcl } from '@/lib/report-acl';
import { readReportFileWithLegacyFallback } from '@/lib/legacy-report-file';
import { logDevError } from '@/lib/log-dev-error';

const MIME_TYPES: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
};

/**
 * GET /api/reports/[id]/thumbnail — serves reports.file_path (the card-view
 * cover image) through the same ACL/storage.read() path as every other
 * report file, instead of a raw public/ URL. Added alongside Phase 16's
 * storage-root move (system-audit-2026-08-30.md item 2): some existing
 * reports' file_path happens to point into assest/report-files/ - the same
 * directory report_files rows use - so once those bytes moved out of
 * public/, a direct <Image src={report.file_path}> broke for them. No
 * download_count/downloads/activity-log side effects - this is a view, like
 * .../files/[fileId]/preview, not a download.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
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
            select: { id: true, file_path: true, file_name: true },
        });
        if (!report || !report.file_path) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }

        if (!isAdmin) {
            const acl = await resolveReportAcl(params.id, authResult.user);
            if (!acl.can_view) {
                return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
            }
        }

        const ext = path.extname(report.file_name || report.file_path).replace('.', '').toLowerCase();
        const contentType = MIME_TYPES[ext];
        if (!contentType) {
            return NextResponse.json({ success: false, error: "Not an image" }, { status: 404 });
        }

        let fileBuffer: Buffer;
        try {
            fileBuffer = await readReportFileWithLegacyFallback(report.file_path);
        } catch {
            return NextResponse.json({ success: false, error: "File not found on server" }, { status: 404 });
        }

        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: { 'Content-Type': contentType },
        });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
