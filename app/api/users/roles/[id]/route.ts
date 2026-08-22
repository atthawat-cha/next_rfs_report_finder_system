import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { buildMenuStructure, buildMenusrenderWithGrants, buildRolePermissionInsert } from '@/lib/user-management';
import { z } from 'zod';
import { logDevError } from '@/lib/log-dev-error';

interface RoleGrantFlags {
    can_view: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
}

/**
 * GET /api/users/roles/[id] — one role's info plus a permission template
 * shaped exactly like /api/baseconfig/permissions's output (consumed by
 * lib/user-management.ts's perConvertToCheckbox), except can_* here reflects
 * this role's actual role_permissions grants instead of being hardcoded
 * true. Lets app/(auth)/permissions/page.tsx seed PermissionsFormCheckbox
 * with the role's real selection instead of starting from a blank slate
 * (which is all the component supported before — fine for the create flow,
 * useless for editing).
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const role = await prisma.roles.findUnique({
            where: { id: params.id },
            select: { id: true, name: true, display_name: true, description: true },
        });
        if (!role) {
            return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
        }

        const permissionsTemplate = await prisma.permissions.findMany({
            select: {
                id: true,
                name: true,
                display_name: true,
                category: true,
                menus: {
                    select: {
                        id: true,
                        group_label: true,
                        catagory_label: true,
                        menu_label: true,
                        sub_menu_label: true,
                        sort_order: true,
                        href: true,
                        icon: true,
                    },
                },
            },
        });

        const grants = await prisma.role_permissions.findMany({
            where: { role_id: role.id },
            select: { permission_id: true, can_view: true, can_create: true, can_update: true, can_delete: true },
        });
        const grantsByPermissionId = new Map<string, RoleGrantFlags>(
            grants.map((g) => [g.permission_id, { can_view: g.can_view, can_create: g.can_create, can_update: g.can_update, can_delete: g.can_delete }])
        );

        const structure = buildMenuStructure(permissionsTemplate);
        const template = buildMenusrenderWithGrants(structure, grantsByPermissionId);

        return NextResponse.json({ success: true, data: { role, template } }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const updateZod = z.object({
    permissions: z.array(z.string()),
});

/**
 * PUT /api/users/roles/[id] — full replacement of one role's permission set.
 * Reuses buildRolePermissionInsert (same function POST /api/users/roles
 * uses at create time) so edit-time and create-time produce identical rows
 * for the same checkbox selection — delete-all-then-recreate-all rather than
 * a selective diff, which is simpler and provably matches create-time
 * behavior exactly (buildRolePermissionInsert always emits one row per
 * permission, true/false flags either way, not just the checked ones).
 *
 * Guard: refuse a PUT on the caller's own role if it would strip can_view
 * from the permission backing the Permission Management screen itself
 * (identified by its menus.href, not by hardcoding its label text) —
 * otherwise an admin could lock themselves out of the very screen they're
 * using to make the change.
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const role = await prisma.roles.findUnique({ where: { id: params.id } });
        if (!role) {
            return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
        }

        const body = await req.json();
        const validate = updateZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const { permissions: selectedIds } = validate.data;

        const isOwnRole = params.id === authResult.user.roles?.id;
        if (isOwnRole) {
            const guardPermission = await prisma.permissions.findFirst({
                where: { menus: { href: '/permissions' } },
                select: { category: true, menus: { select: { catagory_label: true, menu_label: true } } },
            });
            if (guardPermission) {
                const guardId = guardPermission.menus.menu_label
                    ? `p-${guardPermission.category}-${guardPermission.menus.catagory_label}-${guardPermission.menus.menu_label}-view`
                    : `p-${guardPermission.category}-${guardPermission.menus.catagory_label}-view`;
                if (!selectedIds.includes(guardId)) {
                    return NextResponse.json(
                        { success: false, error: "ไม่สามารถถอดสิทธิ์ 'ดู' หน้า Permission Management ออกจาก role ของตัวเองได้ — จะทำให้เข้าหน้านี้ไม่ได้อีก" },
                        { status: 400 }
                    );
                }
            }
        }

        const allPermissions = await prisma.permissions.findMany({
            select: { id: true, name: true, display_name: true, category: true },
        });
        const rows = buildRolePermissionInsert(role.id, allPermissions, selectedIds);

        await prisma.$transaction(async (tx) => {
            await tx.role_permissions.deleteMany({ where: { role_id: role.id } });
            if (rows.length > 0) {
                await tx.role_permissions.createMany({ data: rows });
            }
        });

        await logActivity(req, {
            userId: authResult.user.id,
            action: 'update',
            entity: 'role',
            entityId: role.id,
            description: `Updated permissions for role "${role.name}"`,
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
