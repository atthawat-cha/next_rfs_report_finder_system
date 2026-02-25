import { requireAuth, requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function GET(req:NextRequest){
    // Define accepted roles
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

    const permissionsTemplate = await prisma.permissions.findMany({
        select: {
            id: true,
            name: true,
            display_name: true,
            menu_permissions:{
                select :{
                    id: true,
                    menu_id: true,
                    menus:{
                        select:{
                            id: true,
                            group_label: true,
                            catagory_label: true,
                            menu_label: true,
                            sub_menu_label: true,
                            sort_order: true
                        }
                    }
                }
            }
        }
    });

    return NextResponse.json({success: true, data: permissionsTemplate}, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: console.error()}, {status: 400})
    }
}