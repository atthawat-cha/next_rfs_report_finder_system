import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/activity-log';
import { resolveStoredFile } from '@/lib/storage-path';

const MIME_TYPES: Record<string, string> = {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
};

/**
 * GET /api/shares/[token]/files/[fileId]/download — public, token-gated,
 * no auth (same stance as GET /api/shares/[token]). Added in Phase 5e:
 * app/shares/[token]/page.tsx used to link report_files.file_path directly
 * as a raw href, which only worked by accident because uploads always lived
 * under public/ - once UPLOAD_BASE_PATH points elsewhere that static link
 * 404s. Goes through resolveStoredFile() like the authenticated per-file
 * download endpoint, just gated by the share token instead of a session.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ token: string; fileId: string }> }) {
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

        const file = await prisma.report_files.findFirst({
            where: { id: params.fileId, report_id: share.report_id, is_current: true },
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

        await logActivity(req, {
            userId: null,
            action: 'download',
            entity: 'report',
            entityId: share.report_id,
            description: `Downloaded ${file.file_kind} via share link`,
            metadata: { share_token: params.token },
        });

        const ext = path.extname(file.file_name || file.file_path).replace('.', '').toLowerCase();
        const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

        return new NextResponse(new Uint8Array(fileBuffer), {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${encodeURIComponent(file.file_name || 'download')}"`,
            },
        });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
