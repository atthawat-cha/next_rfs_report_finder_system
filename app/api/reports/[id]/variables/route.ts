import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

const dataTypeZod = z.enum(['STRING', 'NUMBER', 'DATE', 'BOOLEAN']);

/**
 * GET /api/reports/[id]/variables — list report_variables for this report.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const variables = await prisma.report_variables.findMany({
            where: { report_id: params.id },
            orderBy: { sort_order: 'asc' },
        });

        return NextResponse.json({ success: true, data: variables }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const createZod = z.object({
    name: z.string().min(1),
    label: z.string().optional(),
    data_type: dataTypeZod,
    default_value: z.string().optional(),
    is_required: z.boolean().optional().default(false),
    sort_order: z.number().int().optional().default(0),
});

/**
 * POST /api/reports/[id]/variables — create a variable. (report_id, name)
 * uniqueness is pre-checked so callers get a readable 409 instead of a raw
 * Prisma P2002.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
        const data = validate.data;

        const duplicate = await prisma.report_variables.findFirst({
            where: { report_id: params.id, name: data.name },
        });
        if (duplicate) {
            return NextResponse.json({ success: false, error: "Variable name already exists for this report" }, { status: 409 });
        }

        const created = await prisma.report_variables.create({
            data: {
                id: faker.string.uuid(),
                report_id: params.id,
                name: data.name,
                label: data.label,
                data_type: data.data_type,
                default_value: data.default_value,
                is_required: data.is_required,
                sort_order: data.sort_order,
            },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'create',
            entity: 'report',
            entityId: params.id,
            description: `Added variable "${created.name}" to report ${params.id}`,
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
    label: z.string().optional(),
    data_type: dataTypeZod.optional(),
    default_value: z.string().optional(),
    is_required: z.boolean().optional(),
    sort_order: z.number().int().optional(),
});

/**
 * PUT /api/reports/[id]/variables — update a variable. Renaming re-checks
 * (report_id, name) uniqueness against the other rows.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const { id, ...rest } = validate.data;

        const existing = await prisma.report_variables.findFirst({
            where: { id, report_id: params.id },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Variable not found" }, { status: 404 });
        }

        if (rest.name && rest.name !== existing.name) {
            const duplicate = await prisma.report_variables.findFirst({
                where: { report_id: params.id, name: rest.name, id: { not: existing.id } },
            });
            if (duplicate) {
                return NextResponse.json({ success: false, error: "Variable name already exists for this report" }, { status: 409 });
            }
        }

        const updated = await prisma.report_variables.update({
            where: { id: existing.id },
            data: rest,
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'report',
            entityId: params.id,
            description: `Updated variable "${updated.name}" on report ${params.id}`,
        });

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/[id]/variables?id=<variableId>
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const variableId = req.nextUrl.searchParams.get('id');
        if (!variableId) {
            return NextResponse.json({ success: false, error: "Missing id query param" }, { status: 400 });
        }

        const existing = await prisma.report_variables.findFirst({
            where: { id: variableId, report_id: params.id },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Variable not found" }, { status: 404 });
        }

        await prisma.report_variables.delete({ where: { id: existing.id } });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'delete',
            entity: 'report',
            entityId: params.id,
            description: `Deleted variable "${existing.name}" from report ${params.id}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
