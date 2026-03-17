import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';


export async function GET(req: NextRequest) {
    try {
        const acceptedRoles = routeAcceptted('admin');
        // ตรวจสอบการยืนยันตัวตนก่อนเข้าถึงข้อมูล
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const authResult = await requireRole(req, acceptedRoles);

        if (authResult instanceof NextResponse) {
            return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
        }

        const reports = await prisma.reports.findMany({
            select: {
                id: true,
                code: true,
                name_th: true,
                name_en: true,
                description: true,
                file_path: true,
                file_name: true,
                categories: { select: { id: true, name: true } },
                departments: { select: { id: true, name: true } },
                users: { select: { id: true, username: true } },
                created_at: true,
                status: true,
                updated_at: true,
                is_downloadable: true,
                is_editable: true
            }
        })

        if (!reports) {
            return NextResponse.json({ success: false, error: "reports not found" }, { status: 404 });
        }
        // console.log(users);
        return NextResponse.json({ success: true, data: reports }, { status: 200 });
    } catch (error) {
        process.env.NODE_ENV === 'development' && console.log(error)

    }
}