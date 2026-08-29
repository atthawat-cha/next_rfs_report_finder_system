import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { checkGeneralRateLimit } from '@/lib/rate-limit';
import { logActivity } from '@/lib/activity-log';
import { faker } from '@faker-js/faker';
import { z } from 'zod';
import { logDevError } from '@/lib/log-dev-error';

/**
 * GET /api/reports/[id]/permissions — list report_permissions grants for
 * this report, joined with the subject's display name. subject_id isn't
 * FK'd to users/roles (can't do a conditional FK across two tables), so the
 * join happens here in application code instead of via Prisma include.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const grants = await prisma.report_permissions.findMany({
            where: { report_id: params.id },
            orderBy: { created_at: 'asc' },
        });

        const userIds = grants.filter((g) => g.subject_type === 'USER').map((g) => g.subject_id);
        const roleIds = grants.filter((g) => g.subject_type === 'ROLE').map((g) => g.subject_id);

        const [users, roles] = await Promise.all([
            userIds.length
                ? prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, first_name: true, last_name: true, username: true } })
                : Promise.resolve([]),
            roleIds.length
                ? prisma.roles.findMany({ where: { id: { in: roleIds } }, select: { id: true, display_name: true, name: true } })
                : Promise.resolve([]),
        ]);

        const data = grants.map((g) => {
            if (g.subject_type === 'USER') {
                const u = users.find((x) => x.id === g.subject_id);
                return { ...g, subject_name: u ? `${u.first_name} ${u.last_name}`.trim() || u.username : 'Unknown user' };
            }
            const r = roles.find((x) => x.id === g.subject_id);
            return { ...g, subject_name: r ? (r.display_name || r.name) : 'Unknown role' };
        });

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const flagsZod = z.object({
    can_view: z.boolean().optional().default(false),
    can_edit: z.boolean().optional().default(false),
    can_delete: z.boolean().optional().default(false),
    can_favorite: z.boolean().optional().default(false),
    can_export: z.boolean().optional().default(false),
    can_print: z.boolean().optional().default(false),
});

const createZod = z.object({
    subject_type: z.enum(['USER', 'ROLE']),
    subject_id: z.string().min(1),
}).merge(flagsZod);

/**
 * POST /api/reports/[id]/permissions — create a new grant. subject_id must
 * reference an existing users/roles row (validated here, not FK-enforced).
 * A second grant for the same (report, subject_type, subject_id) is
 * rejected with a readable 409 — edit the existing one via PUT instead.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const rate = await checkGeneralRateLimit(authResult.user.id);
        if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

        const report = await prisma.reports.findUnique({ where: { id: params.id }, select: { id: true } });
        if (!report) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = createZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const { subject_type, subject_id, ...flags } = validate.data;

        const subjectExists = subject_type === 'USER'
            ? await prisma.users.findUnique({ where: { id: subject_id }, select: { id: true } })
            : await prisma.roles.findUnique({ where: { id: subject_id }, select: { id: true } });
        if (!subjectExists) {
            return NextResponse.json({ success: false, error: `${subject_type === 'USER' ? 'User' : 'Role'} not found` }, { status: 404 });
        }

        const existing = await prisma.report_permissions.findUnique({
            where: { report_id_subject_type_subject_id: { report_id: params.id, subject_type, subject_id } },
        });
        if (existing) {
            return NextResponse.json({ success: false, error: "Permission grant already exists for this subject — edit it instead" }, { status: 409 });
        }

        const now = new Date();
        const created = await prisma.report_permissions.create({
            data: {
                id: faker.string.uuid(),
                report_id: params.id,
                subject_type,
                subject_id,
                ...flags,
                created_at: now,
                updated_at: now,
            },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'create',
            entity: 'report',
            entityId: params.id,
            description: `Added ${subject_type} permission grant to report ${params.id}`,
        });

        return NextResponse.json({ success: true, data: created }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const updateZod = z.object({ id: z.string().min(1) }).merge(flagsZod.partial());

/**
 * PUT /api/reports/[id]/permissions — update the action flags on an
 * existing grant. subject_type/subject_id are immutable here — to move a
 * grant to a different subject, delete and re-create it (avoids silently
 * colliding with another existing grant outside the unique-constraint path).
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const rate = await checkGeneralRateLimit(authResult.user.id);
        if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const { id, ...flags } = validate.data;

        const existing = await prisma.report_permissions.findFirst({ where: { id, report_id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Permission grant not found" }, { status: 404 });
        }

        const updated = await prisma.report_permissions.update({
            where: { id: existing.id },
            data: { ...flags, updated_at: new Date() },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'report',
            entityId: params.id,
            description: `Updated ${existing.subject_type} permission grant on report ${params.id}`,
        });

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/[id]/permissions?id=<grantId>
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const rate = await checkGeneralRateLimit(authResult.user.id);
        if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

        const grantId = req.nextUrl.searchParams.get('id');
        if (!grantId) {
            return NextResponse.json({ success: false, error: "Missing id query param" }, { status: 400 });
        }

        const existing = await prisma.report_permissions.findFirst({ where: { id: grantId, report_id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Permission grant not found" }, { status: 404 });
        }

        await prisma.report_permissions.delete({ where: { id: existing.id } });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'delete',
            entity: 'report',
            entityId: params.id,
            description: `Deleted ${existing.subject_type} permission grant from report ${params.id}`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
