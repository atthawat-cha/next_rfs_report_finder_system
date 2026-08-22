import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { faker } from '@faker-js/faker';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';
import { logActivity } from '@/lib/activity-log';
import { logDevError } from '@/lib/log-dev-error';
import { parsePagination } from '@/lib/pagination';

export async function GET(req: NextRequest) {
    // กำหนดบทบาทที่สามารถเข้าถึงข้อมูลนี้ได้
    const acceptedRoles = routeAcceptted('admin');

    try {
        // ตรวจสอบการยืนยันตัวตนก่อนเข้าถึงข้อมูล
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, acceptedRoles);

        if (authResult instanceof NextResponse) {
            return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
        }

        const searchParams = req.nextUrl.searchParams;
        // Paginated only when explicitly requested - other callers (report-edit's
        // department-share dropdown) depend on getting every department back.
        const isPaged = searchParams.has('page') || searchParams.has('pageSize');
        const { page, pageSize, skip, take } = await parsePagination(searchParams);

        const [departments, total] = await Promise.all([
            prisma.departments.findMany({
                select: {
                    id: true,
                    name: true,
                    code: true,
                    is_active: true,
                    created_at: true,
                    updated_at: true,
                },
                ...(isPaged ? { skip, take } : {}),
            }),
            prisma.departments.count(),
        ]);

        if (total === 0) {
            return NextResponse.json({ error: "Departments not found" }, { status: 404 });
        }
        const meta = isPaged
            ? { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
            : { page: 1, pageSize: total, total, totalPages: 1 };
        return NextResponse.json({ success: true, data: departments, meta });
    } catch {
        return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
    }
}



// POST /api/users/departments
// Create new department
const validateSchema = z.object({
    name: z.string().min(1).max(255),
    code: z.string().min(1).max(255),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
});
export async function POST(req: NextRequest) {
    const acceptedRoles = ['admin', 'super_admin']; // กำหนดบทบาทที่สามารถเข้าถึงข้อมูลนี้ได้

    try {
        // ตรวจสอบการยืนยันตัวตนก่อนเข้าถึงข้อมูล
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, acceptedRoles);

        if (authResult instanceof NextResponse) {
            return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
        }

        const body = await req.json();
        const validatedBody = validateSchema.parse(body);


        if (!validatedBody) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const params = {
            id: faker.string.uuid(),
            name: validatedBody.name,
            code: validatedBody.code,
            description: validatedBody.description,
            is_active: validatedBody.is_active,
            created_at: new Date(),
            updated_at: new Date(),
        }
        const department = await prisma.departments.create({
            data: params,
        });

        await logActivity(req, {
            userId: authResult.user?.id,
            action: 'create',
            entity: 'department',
            entityId: department.id,
            description: `Created department "${department.code}"`,
        });

        return NextResponse.json({ success: true, data: department });
    } catch (error) {
        logDevError(error);
        return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
    }
}
