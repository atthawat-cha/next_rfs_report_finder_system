import path from 'path';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity-log';
import { readReportFileWithLegacyFallback } from '@/lib/legacy-report-file';
import { logDevError } from '@/lib/log-dev-error';

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
 * GET /api/shares/[token]/download — public, token-gated, no auth (same
 * stance as GET /api/shares/[token]). Serves the legacy reports.file_path
 * fallback (id null in GET /api/shares/[token]'s files[]) that
 * app/shares/[token]/page.tsx used to link to directly as a raw href -
 * that only worked by accident because uploads always lived under public/;
 * Phase 16b (system-audit-2026-08-30.md item 2) moved report_files-adjacent
 * content out, so this route reads through the same legacy-fallback helper
 * report/[id]/download and report/[id]/thumbnail already use. Mirrors
 * .../files/[fileId]/download's token/expiry/can_download checks.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    try {
        const share = await prisma.report_shares.findUnique({ where: { share_token: params.token } });
        if (!share) {
            return NextResponse.json({ success: false, error: "Share link not found" }, { status: 404 });
        }
        if (share.expires_at && share.expires_at < new Date()) {
            return NextResponse.json({ success: false, error: "Share link has expired" }, { status: 410 });
        }
        if (!share.can_download) {
            return NextResponse.json({ success: false, error: "This share does not allow downloads" }, { status: 403 });
        }

        const report = await prisma.reports.findUnique({
            where: { id: share.report_id },
            select: { file_path: true, file_name: true },
        });
        if (!report || !report.file_path) {
            return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
        }

        let fileBuffer: Buffer;
        try {
            fileBuffer = await readReportFileWithLegacyFallback(report.file_path);
        } catch {
            return NextResponse.json({ success: false, error: "File not found on server" }, { status: 404 });
        }

        await logActivity(req, {
            userId: null,
            action: 'download',
            entity: 'report',
            entityId: share.report_id,
            description: `Downloaded report via share link`,
            metadata: { share_token: params.token },
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
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
