import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/shares/[token] — public, token-gated, no auth check by design
 * (see document/phase3-plan.md sub-phase 3b). Returns report metadata
 * always; current report_files only when the share grants can_download.
 * can_edit is intentionally never consulted here — there's no anonymous
 * edit flow for a share link.
 */
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
    try {
        const share = await prisma.report_shares.findUnique({
            where: { share_token: params.token },
        });
        if (!share) {
            return NextResponse.json({ success: false, error: "Share link not found" }, { status: 404 });
        }
        if (share.expires_at && share.expires_at < new Date()) {
            return NextResponse.json({ success: false, error: "Share link has expired" }, { status: 410 });
        }

        const report = await prisma.reports.findUnique({
            where: { id: share.report_id },
            select: {
                id: true,
                code: true,
                name_th: true,
                name_en: true,
                description: true,
                output_type: true,
            },
        });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        let files: { file_kind: string; file_path: string; file_name: string }[] = [];
        if (share.can_download) {
            const current = await prisma.report_files.findMany({
                where: { report_id: share.report_id, is_current: true },
                select: { file_kind: true, file_path: true, file_name: true },
            });
            files = current;
        }

        return NextResponse.json(
            { success: true, data: { report, files, can_download: share.can_download } },
            { status: 200 }
        );
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
