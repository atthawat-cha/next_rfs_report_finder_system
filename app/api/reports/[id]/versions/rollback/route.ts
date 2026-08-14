import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { syncReportFileCache } from '@/lib/report-file-cache';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

const bodyZod = z.discriminatedUnion('target', [
    z.object({ target: z.literal('file'), report_files_id: z.string().min(1) }),
    z.object({ target: z.literal('query'), version_id: z.string().min(1) }),
]);

/**
 * POST /api/reports/[id]/versions/rollback — restore a historical file
 * version or query snapshot. Doesn't duplicate rows for files (just toggles
 * is_current back onto the target row, mirrors the same mechanism POST
 * /files already uses); for queries it snapshots the pre-rollback state
 * first so rolling back never destroys history in the other direction.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const validate = bodyZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }

        const user = await getCurrentUser();

        if (validate.data.target === 'file') {
            const target = await prisma.report_files.findFirst({
                where: { id: validate.data.report_files_id, report_id: params.id },
            });
            if (!target) {
                return NextResponse.json({ success: false, error: "File version not found" }, { status: 404 });
            }

            await prisma.$transaction(async (tx) => {
                await tx.report_files.updateMany({
                    where: { report_id: params.id, file_kind: target.file_kind, id: { not: target.id } },
                    data: { is_current: false },
                });
                await tx.report_files.update({ where: { id: target.id }, data: { is_current: true } });
            });
            await syncReportFileCache(params.id);

            await logActivity(req, {
                userId: user?.id ?? null,
                action: 'update',
                entity: 'report',
                entityId: params.id,
                description: `Rolled back ${target.file_kind} to v${target.version} on report ${params.id}`,
            });

            return NextResponse.json({ success: true }, { status: 200 });
        }

        const version = await prisma.report_query_versions.findUnique({
            where: { id: validate.data.version_id },
            include: { report_queries: true },
        });
        if (!version || version.report_queries.report_id !== params.id) {
            return NextResponse.json({ success: false, error: "Query version not found" }, { status: 404 });
        }
        const query = version.report_queries;

        const now = new Date();
        const nextVersion = (parseFloat(query.version) + 0.1).toFixed(1);

        await prisma.$transaction(async (tx) => {
            await tx.report_query_versions.create({
                data: {
                    id: faker.string.uuid(),
                    query_id: query.id,
                    version: query.version,
                    sql_text: query.sql_text,
                    change_log: `Superseded by rollback to v${version.version}`,
                    created_by: user?.id as string,
                    created_at: now,
                },
            });
            await tx.report_queries.update({
                where: { id: query.id },
                data: { sql_text: version.sql_text, version: nextVersion, updated_at: now },
            });
        });

        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'report',
            entityId: params.id,
            description: `Rolled back query "${query.name}" to v${version.version} on report ${params.id}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
