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

        const reportRow = await prisma.reports.findUnique({
            where: { id: share.report_id },
            select: {
                id: true,
                code: true,
                name_th: true,
                name_en: true,
                description: true,
                output_type: true,
                file_path: true,
                file_name: true,
            },
        });
        if (!reportRow) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }
        // file_path/file_name are only for the fallback below - strip them from
        // what's actually sent back so a can_download=false share never leaks a path.
        const { file_path, file_name, ...report } = reportRow;

        let files: { file_kind: string; file_path: string; file_name: string }[] = [];
        if (share.can_download) {
            files = await prisma.report_files.findMany({
                where: { report_id: share.report_id, is_current: true },
                select: { file_kind: true, file_path: true, file_name: true },
            });

            // Reports created before report_files existed (or never had a file
            // uploaded through it) have no rows here at all - fall back to the
            // reports.file_path/file_name cache column the normal (authenticated)
            // download endpoint reads, so old reports don't show as file-less.
            if (files.length === 0 && file_path) {
                files = [{
                    file_kind: reportRow.output_type === 'PRINT_FORM' ? 'BLANK_FORM' : 'SAMPLE_DATA',
                    file_path,
                    file_name: file_name ?? '',
                }];
            }
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
