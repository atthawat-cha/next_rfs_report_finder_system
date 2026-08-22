import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { logDevError } from '@/lib/log-dev-error';
import { parsePagination } from '@/lib/pagination';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

/**
 * GET /api/reports/categories — admin-tier, same as the other report
 * master-data endpoints (departments/tags/menus). Paginated only when the
 * caller opts in via ?page/?pageSize, so the report-create/edit forms'
 * category dropdowns keep getting the full list.
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const searchParams = req.nextUrl.searchParams;
        const isPaged = searchParams.has('page') || searchParams.has('pageSize');
        const { page, pageSize, skip, take } = await parsePagination(searchParams);

        const [categories, total] = await Promise.all([
            prisma.categories.findMany({
                orderBy: { sort_order: 'asc' },
                ...(isPaged ? { skip, take } : {}),
            }),
            prisma.categories.count(),
        ]);

        const meta = isPaged
            ? { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
            : { page: 1, pageSize: total, total, totalPages: 1 };
        return NextResponse.json({ success: true, data: categories, meta }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const createZod = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    description: z.string().optional().nullable(),
    parent_id: z.string().optional().nullable(),
    icon: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    sort_order: z.coerce.number().int().optional(),
    is_active: z.boolean().optional(),
});

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

        const existing = await prisma.categories.findUnique({ where: { code: data.code } });
        if (existing) {
            return NextResponse.json({ success: false, error: "Code already exists" }, { status: 409 });
        }

        const category = await prisma.categories.create({
            data: {
                id: faker.string.uuid(),
                name: data.name,
                code: data.code,
                description: data.description ?? null,
                parent_id: data.parent_id ?? null,
                icon: data.icon ?? null,
                color: data.color ?? null,
                sort_order: data.sort_order ?? 0,
                is_active: data.is_active ?? true,
                updated_at: now,
            },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'create',
            entity: 'category',
            entityId: category.id,
            description: `Created category "${category.name}"`,
        });

        return NextResponse.json({ success: true, data: category }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
