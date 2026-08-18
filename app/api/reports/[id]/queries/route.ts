import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

/**
 * GET /api/reports/[id]/queries — list report_queries for this report.
 * Reference/documentation only (system-design.md §5.2) — sql_text is never
 * executed by the app.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const queries = await prisma.report_queries.findMany({
            where: { report_id: params.id },
            orderBy: [{ is_main: 'desc' }, { created_at: 'asc' }],
        });

        return NextResponse.json({ success: true, data: queries }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const createZod = z.object({
    name: z.string().min(1),
    sql_text: z.string().min(1),
    is_main: z.boolean().optional().default(false),
});

/**
 * POST /api/reports/[id]/queries — create a new query. If is_main=true and
 * another query on this report is already main, that one is auto-demoted in
 * the same transaction (mirrors report_files.is_current toggling).
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const report = await prisma.reports.findUnique({ where: { id: params.id }, select: { id: true } });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = createZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const { name, sql_text, is_main } = validate.data;

        const user = await getCurrentUser();
        const now = new Date();

        const created = await prisma.$transaction(async (tx) => {
            if (is_main) {
                await tx.report_queries.updateMany({
                    where: { report_id: params.id, is_main: true },
                    data: { is_main: false },
                });
            }
            return tx.report_queries.create({
                data: {
                    id: faker.string.uuid(),
                    report_id: params.id,
                    name,
                    sql_text,
                    is_main,
                    version: '1.0',
                    created_by: user?.id as string,
                    created_at: now,
                    updated_at: now,
                },
            });
        });

        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'create',
            entity: 'report',
            entityId: params.id,
            description: `Added query "${created.name}" to report ${params.id}`,
        });

        return NextResponse.json({ success: true, data: created }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const updateZod = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    sql_text: z.string().min(1).optional(),
    is_main: z.boolean().optional(),
    change_log: z.string().optional(),
});

/**
 * PUT /api/reports/[id]/queries — update a query. Changing sql_text
 * snapshots the pre-change state into report_query_versions first, then
 * bumps version. Setting is_main=true auto-demotes the previous main query.
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const { id, name, sql_text, is_main, change_log } = validate.data;

        const existing = await prisma.report_queries.findFirst({
            where: { id, report_id: params.id },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Query not found" }, { status: 404 });
        }

        const user = await getCurrentUser();
        const now = new Date();
        const sqlChanged = sql_text !== undefined && sql_text !== existing.sql_text;
        const nextVersion = sqlChanged
            ? (parseFloat(existing.version) + 0.1).toFixed(1)
            : existing.version;

        const updated = await prisma.$transaction(async (tx) => {
            if (sqlChanged) {
                await tx.report_query_versions.create({
                    data: {
                        id: faker.string.uuid(),
                        query_id: existing.id,
                        version: existing.version,
                        sql_text: existing.sql_text,
                        change_log: change_log ?? null,
                        created_by: user?.id as string,
                        created_at: now,
                    },
                });
            }
            if (is_main === true) {
                await tx.report_queries.updateMany({
                    where: { report_id: params.id, is_main: true, id: { not: existing.id } },
                    data: { is_main: false },
                });
            }
            return tx.report_queries.update({
                where: { id: existing.id },
                data: {
                    name: name ?? existing.name,
                    sql_text: sql_text ?? existing.sql_text,
                    is_main: is_main ?? existing.is_main,
                    version: nextVersion,
                    updated_at: now,
                },
            });
        });

        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'report',
            entityId: params.id,
            description: `Updated query "${updated.name}" on report ${params.id}`,
        });

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/[id]/queries?id=<queryId> — delete a query. Cascades
 * to report_query_versions via schema. Not blocked even if it's the main
 * query (MVP, same stance as report_files DELETE).
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const queryId = req.nextUrl.searchParams.get('id');
        if (!queryId) {
            return NextResponse.json({ success: false, error: "Missing id query param" }, { status: 400 });
        }

        const existing = await prisma.report_queries.findFirst({
            where: { id: queryId, report_id: params.id },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Query not found" }, { status: 404 });
        }

        await prisma.report_queries.delete({ where: { id: existing.id } });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'delete',
            entity: 'report',
            entityId: params.id,
            description: `Deleted query "${existing.name}" from report ${params.id}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
