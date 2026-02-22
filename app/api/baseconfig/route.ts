import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getAuthFromRequest, requireRole } from '@/lib/auth';


export async function GET(req:NextRequest){
    const acceptedRoles = ['admin', 'manager']; // กำหนดบทบาทที่สามารถเข้าถึงข้อมูลนี้ได้

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

        const baseRole = prisma.roles.findMany({
            select: {
                id: true,
                name: true,
            }
        })

        // const baseDept = prisma.departments.findMany({
        //     select: {
        //         id: true,
        //         name: true,
        //     }
        // })

        // const baseTag = prisma.tags.findMany({
        //     select: {
        //         id: true,
        //         name: true,
        //     }
        // })

        // const baseCatagory = prisma.categories.findMany({
        //     select: {
        //         id: true,
        //         name: true,
        //     }
        // })

        // console.log(JSON.stringify(baseRole));

        // const baseConfig = {
        //     baseRole,
        //     baseDept,
        //     baseTag,
        //     baseCatagory
        // }

        return NextResponse.json(baseRole);
        
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "Internal server error"}, {status: 500});
    }
}