import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';
import { logDevError } from '@/lib/log-dev-error';

const updateZod = z.object({
    group_label: z.string().min(1).optional(),
    catagory_label: z.string().min(1).optional(),
    menu_label: z.string().min(1).optional().nullable(),
    sub_menu_label: z.string().min(1).optional().nullable(),
    href: z.string().min(1).optional().nullable(),
    icon: z.string().min(1).optional().nullable(),
    sort_order: z.coerce.number().int().optional(),
});

/**
 * PUT /api/baseconfig/menus/[id] — edit a menu row's labels/href/icon/sort_order.
 * Does not touch the linked permissions row's name/category - a later CRUD
 * pass could sync that too, but keeping it out of scope here avoids
 * silently renaming a permission (and therefore every checkbox id built
 * from it) as a side effect of an unrelated label tweak.
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.menus.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Menu not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const data = validate.data;

        const updated = await prisma.menus.update({
            where: { id: params.id },
            data: { ...data, updated_at: new Date() },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'update',
            entity: 'menu',
            entityId: updated.id,
            description: `Updated menu "${updated.catagory_label}" in group "${updated.group_label}"`,
        });

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * DELETE /api/baseconfig/menus/[id]?dry_run=1 — reports how many
 * permissions/role_permissions rows would cascade-delete without deleting
 * anything. Without dry_run, actually deletes (DB FK ON DELETE CASCADE
 * handles permissions -> role_permissions across every role that had a
 * grant on it). The UI must show the dry-run counts and get a confirm
 * before calling this without dry_run - deleting a menu that's in active
 * use silently strips every role's grant on it with no way back.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.menus.findUnique({ where: { id: params.id } });
        if (!existing) {
            return NextResponse.json({ success: false, error: "Menu not found" }, { status: 404 });
        }

        const permissionRows = await prisma.permissions.findMany({
            where: { menu_id: params.id },
            select: { id: true },
        });
        const permissionIds = permissionRows.map((p) => p.id);
        const rolePermissionCount = permissionIds.length
            ? await prisma.role_permissions.count({ where: { permission_id: { in: permissionIds } } })
            : 0;

        const isDryRun = req.nextUrl.searchParams.get('dry_run') === '1';
        if (isDryRun) {
            return NextResponse.json(
                { success: true, data: { permissions_count: permissionIds.length, role_permissions_count: rolePermissionCount } },
                { status: 200 }
            );
        }

        await prisma.menus.delete({ where: { id: params.id } });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'delete',
            entity: 'menu',
            entityId: params.id,
            description: `Deleted menu "${existing.catagory_label}" in group "${existing.group_label}" (cascaded ${permissionIds.length} permission(s), ${rolePermissionCount} role_permissions row(s))`,
        });

        return NextResponse.json(
            { success: true, data: { permissions_count: permissionIds.length, role_permissions_count: rolePermissionCount } },
            { status: 200 }
        );
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
