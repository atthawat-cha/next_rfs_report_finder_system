export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getAuthFromRequest, requireRole, routeAcceptted } from '@/lib/auth';
import { ReportStatus, UserStatus } from '@/app/generated/prisma/enums';


export async function GET(req:NextRequest){
    const acceptedRoles = routeAcceptted('admin'); // กำหนดบทบาทที่สามารถเข้าถึงข้อมูลนี้ได้

    try {
         // ตรวจสอบการยืนยันตัวตนก่อนเข้าถึงข้อมูล
        const auth = getAuthFromRequest(req);
        if (!auth) {
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
        }

        const authResult = await requireRole(req, acceptedRoles);
                if (authResult instanceof NextResponse) {
                    return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
        }

        const baseRole = await prisma.roles.findMany({
            select: {
                id: true,
                name: true,
            }
        })

        const baseDept = await prisma.departments.findMany({
            select: {
                id: true,
                name: true,
            }
        })

        const baseTag = await prisma.tags.findMany({
            select: {
                id: true,
                name: true,
            }
        })

        const baseCatagory = await prisma.categories.findMany({
            select: {
                id: true,
                name: true,
            }
        })

        const baseStatus = [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.SUSPENDED]

        const basereportStatus = [ReportStatus.DRAFT, ReportStatus.PUBLISHED, ReportStatus.ARCHIVED]

        const baseConfig = {
            baseRole,
            baseDept,
            baseTag,
            baseCatagory,
            baseStatus,
            basereportStatus
        }

        return NextResponse.json({success:true,baseConfig}, {status: 200});
        
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "Internal server error"}, {status: 500});
    }
}