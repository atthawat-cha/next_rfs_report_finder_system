import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { logDevError } from '@/lib/log-dev-error';
import { z } from 'zod';

const updateZod = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.tags.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Tag not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const data = validate.data;

        if (data.name && data.name !== existing.name) {
            const taken = await prisma.tags.findUnique({ where: { name: data.name } });
            if (taken) {
                return NextResponse.json({ success: false, error: "Name already exists" }, { status: 409 });
            }
        }
        if (data.slug && data.slug !== existing.slug) {
            const taken = await prisma.tags.findUnique({ where: { slug: data.slug } });
            if (taken) {
                return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 409 });
            }
        }

        const updated = await prisma.tags.update({
            where: { id: params.id },
            data: { ...data, updated_at: new Date() },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'tag',
            entityId: updated.id,
            description: `Updated tag "${updated.name}"`,
        });

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/tags/[id] — safe to delete unconditionally: tags ->
 * report_tags is onDelete: Cascade in schema.prisma, so this only ever
 * un-tags whatever reports had it, never a blocked FK.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.tags.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Tag not found" }, { status: 404 });
        }

        const reportCount = await prisma.report_tags.count({ where: { tag_id: params.id } });

        await prisma.tags.delete({ where: { id: params.id } });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'delete',
            entity: 'tag',
            entityId: params.id,
            description: `Deleted tag "${existing.name}" (untagged ${reportCount} report(s))`,
        });

        return NextResponse.json({ success: true, data: { reports_untagged: reportCount } }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
