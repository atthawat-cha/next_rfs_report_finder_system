export const dynamic = 'force-dynamic';
import { requireAuth, requireRole, routeAcceptted } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { buildMenusrender, buildMenuStructure } from "@/lib/user-management";
import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";


export async function GET(req:NextRequest){
    // Define accepted roles
    const acceptedRoles = routeAcceptted('admin');

    try {
        // Check Auth
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth; // 401 or 403

    // Check if user has at least one of the allowed roles
    const authResult = await requireRole(req, acceptedRoles);
    if (authResult instanceof NextResponse) {
        return authResult; // ส่งต่อการตอบกลับ 401 หรือ 403 จาก requireRole
    }

    const permissionsTemplate = await prisma.permissions.findMany({
        select: {
            id: true,
            name: true,
            display_name: true,
            category: true,
            menus: {
                select: {
                    id: true,
                    group_label: true,
                    catagory_label: true,
                    menu_label: true,
                    sub_menu_label: true,
                    sort_order: true,
                    href: true,
                    icon: true
                }
            }
            
        }
    })
    const result = buildMenusrender(buildMenuStructure(permissionsTemplate));

    return NextResponse.json({success: true, data:result}, { status: 200 });
    } catch (error) {
        logger.error({ error }, 'GET /api/baseconfig/permissions failed');
        return NextResponse.json({error: error instanceof Error ? error.message : "Bad Request"}, {status: 400})
    }
}

