import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, routeAcceptted } from '@/lib/auth';

/**
 * GET /api/reports/[id]/versions — unified, read-only version history for
 * this report. Doesn't introduce a new table: file history already lives in
 * report_files (is_current=false rows are kept, not deleted, since Phase 2b)
 * and query history already lives in report_query_versions (since Phase 2c).
 * See document/phase3-plan.md sub-phase 3a.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const [files, queries] = await Promise.all([
            prisma.report_files.findMany({
                where: { report_id: params.id },
                orderBy: [{ file_kind: 'asc' }, { created_at: 'desc' }],
            }),
            prisma.report_queries.findMany({
                where: { report_id: params.id },
                include: { report_query_versions: { orderBy: { created_at: 'desc' } } },
                orderBy: [{ is_main: 'desc' }, { created_at: 'asc' }],
            }),
        ]);

        // file_size is BigInt — JSON.stringify can't serialize it directly
        const filesByKind: Record<string, unknown[]> = {};
        for (const f of files) {
            const kind = f.file_kind;
            if (!filesByKind[kind]) filesByKind[kind] = [];
            filesByKind[kind].push({ ...f, file_size: Number(f.file_size) });
        }

        return NextResponse.json({ success: true, data: { files: filesByKind, queries } }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
