import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { logDevError } from '@/lib/log-dev-error';
import { z } from 'zod';

const updateZod = z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    parent_id: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    sort_order: z.coerce.number().int().optional(),
    is_active: z.boolean().optional(),
});

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.categories.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const data = validate.data;

        if (data.code && data.code !== existing.code) {
            const codeTaken = await prisma.categories.findUnique({ where: { code: data.code } });
            if (codeTaken) {
                return NextResponse.json({ success: false, error: "Code already exists" }, { status: 409 });
            }
        }

        if (data.parent_id === params.id) {
            return NextResponse.json({ success: false, error: "A category cannot be its own parent" }, { status: 400 });
        }

        const updated = await prisma.categories.update({
            where: { id: params.id },
            data: { ...data, updated_at: new Date() },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'category',
            entityId: updated.id,
            description: `Updated category "${updated.name}"`,
        });

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/reports/categories/[id] — unlike menus (which cascades and
 * warns first), a category referenced by any report or with child
 * categories is blocked outright: reports.category_id is a required column
 * (no onDelete rule), so letting the DELETE hit Postgres would surface a
 * raw FK-violation 500 instead of a readable error.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.categories.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
        }

        const [reportCount, childCount] = await Promise.all([
            prisma.reports.count({ where: { category_id: params.id } }),
            prisma.categories.count({ where: { parent_id: params.id } }),
        ]);
        if (reportCount > 0 || childCount > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Cannot delete: ${reportCount} report(s) and ${childCount} child categor${childCount === 1 ? 'y' : 'ies'} still reference this category`,
                },
                { status: 409 }
            );
        }

        await prisma.categories.delete({ where: { id: params.id } });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'delete',
            entity: 'category',
            entityId: params.id,
            description: `Deleted category "${existing.name}"`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
