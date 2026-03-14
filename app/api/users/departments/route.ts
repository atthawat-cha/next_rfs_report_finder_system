import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { faker } from '@faker-js/faker';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

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

        const departments = await prisma.departments.findMany({
            select: {
                id: true,
                name: true,
                code: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            }
        });

        if (departments.length === 0) {
            return NextResponse.json({ error: "Departments not found" }, { status: 404 });
        }
        return NextResponse.json(departments);
    } catch (error) {
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

        return NextResponse.json(department);
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error);
        return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
    }
}
