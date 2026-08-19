import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

/**
 * GET /api/baseconfig/menus — list every menus row, sorted so rows for the
 * same group_label/catagory_label sit together (a flat table read top to
 * bottom then reads as "grouped" without needing a tree widget).
 *
 * These rows drive the role-permission model (permissions.menu_id ->
 * menus.id) — NOT the sidebar, which still renders lib/menu-list.ts as a
 * separate static structure (see CLAUDE.md). Editing here has zero visual
 * effect on navigation by design (Phase 5 decision 7).
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const menus = await prisma.menus.findMany({
            orderBy: [{ group_label: 'asc' }, { catagory_label: 'asc' }, { sort_order: 'asc' }],
        });

        return NextResponse.json({ success: true, data: menus }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const createZod = z.object({
    group_label: z.string().min(1),
    catagory_label: z.string().min(1),
    menu_label: z.string().min(1).optional().nullable(),
    sub_menu_label: z.string().min(1).optional().nullable(),
    href: z.string().min(1).optional().nullable(),
    icon: z.string().min(1).optional().nullable(),
    sort_order: z.coerce.number().int().optional(),
});

/**
 * POST /api/baseconfig/menus — create a menu row. menus.id is the one model
 * in this schema that does NOT take an application-generated id
 * (@default(dbgenerated("gen_random_uuid()"))) - omit id entirely rather
 * than following the faker.string.uuid() pattern used everywhere else.
 *
 * A corresponding permissions row is created in the same transaction so a
 * freshly-added menu is immediately grantable from /permissions (5c) -
 * matches prisma/seeds/permission.seed.ts's one-permissions-row-per-menu
 * convention (name = menu_label ?? catagory_label, category = group_label).
 */
export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();
        const validate = createZod.safeParse(body);
        if (!validate.success) {
            return NextResponse.json({ success: false, error: validate.error.errors }, { status: 400 });
        }
        const data = validate.data;
        const now = new Date();

        const menu = await prisma.$transaction(async (tx) => {
            const created = await tx.menus.create({
                data: {
                    group_label: data.group_label,
                    catagory_label: data.catagory_label,
                    menu_label: data.menu_label ?? null,
                    sub_menu_label: data.sub_menu_label ?? null,
                    href: data.href ?? null,
                    icon: data.icon ?? null,
                    sort_order: data.sort_order ?? 0,
                    updated_at: now,
                },
            });

            await tx.permissions.create({
                data: {
                    id: faker.string.uuid(),
                    name: data.menu_label ?? data.catagory_label,
                    display_name: data.menu_label ?? data.catagory_label,
                    category: data.group_label,
                    menu_id: created.id,
                    updated_at: now,
                },
            });

            return created;
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'create',
            entity: 'menu',
            entityId: menu.id,
            description: `Created menu "${menu.catagory_label}" in group "${menu.group_label}"`,
        });

        return NextResponse.json({ success: true, data: menu }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
