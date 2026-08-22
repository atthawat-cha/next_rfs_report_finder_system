import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireRole, routeAcceptted } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { logDevError } from '@/lib/log-dev-error';
import { parsePagination } from '@/lib/pagination';
import { faker } from '@faker-js/faker';
import { z } from 'zod';

/**
 * GET /api/reports/tags — admin-tier, same shape/pagination convention as
 * GET /api/reports/categories.
 */
export async function GET(req: NextRequest) {
    try {
        const authResult = await requireRole(req, routeAcceptted('admin'));
        if (authResult instanceof NextResponse) return authResult;

        const searchParams = req.nextUrl.searchParams;
        const isPaged = searchParams.has('page') || searchParams.has('pageSize');
        const { page, pageSize, skip, take } = await parsePagination(searchParams);

        const [tags, total] = await Promise.all([
            prisma.tags.findMany({
                orderBy: { name: 'asc' },
                ...(isPaged ? { skip, take } : {}),
            }),
            prisma.tags.count(),
        ]);

        const meta = isPaged
            ? { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
            : { page: 1, pageSize: total, total, totalPages: 1 };
        return NextResponse.json({ success: true, data: tags, meta }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

const createZod = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional().nullable(),
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

        const [nameTaken, slugTaken] = await Promise.all([
            prisma.tags.findUnique({ where: { name: data.name } }),
            prisma.tags.findUnique({ where: { slug: data.slug } }),
        ]);
        if (nameTaken) {
            return NextResponse.json({ success: false, error: "Name already exists" }, { status: 409 });
        }
        if (slugTaken) {
            return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 409 });
        }

        const tag = await prisma.tags.create({
            data: {
                id: faker.string.uuid(),
                name: data.name,
                slug: data.slug,
                description: data.description ?? null,
                updated_at: new Date(),
            },
        });

        const user = await getCurrentUser();
        await logActivity(req, {
            userId: user?.id ?? null,
            action: 'create',
            entity: 'tag',
            entityId: tag.id,
            description: `Created tag "${tag.name}"`,
        });

        return NextResponse.json({ success: true, data: tag }, { status: 200 });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
