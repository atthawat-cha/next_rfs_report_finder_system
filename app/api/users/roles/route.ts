import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';

export async function GET(req:NextRequest){
    const acceptedRoles = ['admin'];
    try {
        // Check Auth
        const auth = await requireAuth(req);
        if (auth instanceof NextResponse) return auth; // 401 or 403

        // Check if user has at least one of the allowed roles
        const authResult = await requireRole(req, acceptedRoles);
        if (authResult instanceof NextResponse) {
            return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
        }

        const roles = await prisma.roles.findMany({
            select: {
                id: true,
                name: true,
                user_roles: true,
                created_at: true,
                updated_at: true,
            },
            orderBy: {
                created_at: 'asc',
            }
        });

        if (roles.length === 0) {
            return NextResponse.json({error: "Roles not found"}, {status: 404});
        }
        return NextResponse.json(roles);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: console.error() },
            { status: 400 }
        )
    }
}