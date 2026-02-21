import { getAuthFromRequest, requireRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(req:NextRequest){
    try {
        // ตรวจสอบการยืนยันตัวตนก่อนเข้าถึงข้อมูล
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
        }

        const acceptedRoles = ['admin', 'manager']; // กำหนดบทบาทที่สามารถเข้าถึงข้อมูลนี้ได้
        const authResult = await requireRole(req, acceptedRoles);

        console.log("Auth Result:", authResult);

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
            return NextResponse.json({error: "Departments not found"}, {status: 404});
        }

        return NextResponse.json(departments);
    } catch (error) {
        console.log(error);
        return NextResponse.json({error: "Failed to fetch departments"}, {status: 500});
    }
}