import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import z from 'zod';
import { fa, faker } from '@faker-js/faker';

// GET all roles
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
                _count:{
                    select:{users:true}
                },
                id: true,
                name: true,
                display_name: true,
                description: true,
                role_permissions:{
                    select:{
                        id: true,
                        permission_id: true,
                        can_create: true,
                        can_view: true,
                        can_update: true,
                        can_delete: true,
                        permissions: {
                            select:{
                                id: true,
                                name: true,
                                display_name: true,
                                category: true,
                            }
                        },
                    },
                },
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



// POST create role

const roleZod = z.object({
    name: z.string().min(1, 'กรุณากรอกชื่อ'),
    display_name: z.string().min(1, 'กรุณากรอกชื่อแสดง')
})

const permissionZod = z.object({
    role_id: z.string().min(1, 'กรุณาเลือกหน่วยงาน'),
    permission_id: z.string().min(1, 'กรุณาเลือกหน่วยงาน'),
    can_create: z.boolean().default(false),
    can_view: z.boolean().default(true),
    can_update: z.boolean().default(false),
    can_delete: z.boolean().default(false),
})
export async function POST(req:NextRequest){
    
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

        // Validate request body
        const body = await req.json();
        const {roleData , permissionData} = body;

        const roleValidate = roleZod.parse(roleData);
        const permissionValidate = permissionZod.parse(permissionData);
        if (!roleValidate || !permissionValidate) {
            return NextResponse.json({error: "Invalid input"}, {status: 400});
        }

        const permissions = await prisma.permissions.findMany({
            select:{
                id: true
            }
        });

        // Vlidate Data
        const res =await prisma.$transaction(async (prisma) => {        
            const role = await prisma.roles.create({
                data: {
                    id: faker.string.uuid(),
                    name: roleValidate.name,
                    display_name: roleValidate.display_name,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            })

            await prisma.role_permissions.createMany({
                data: insertArray(role,permissions),
            })
            
            // for (const permission of permissions) {
            //     await prisma.role_permissions.create({
            //         data: {
            //             id: faker.string.uuid(),
            //             role_id: role.id,
            //             permission_id: permission.id,
            //             can_create: permissionValidate.can_create ,
            //             can_view: permissionValidate.can_view,
            //             can_update: permissionValidate.can_update,
            //             can_delete: permissionValidate.can_delete,
            //             created_at: new Date(),
            //         },
            //     })
            // }
        })
        return NextResponse.json({success: true, data: []}, {status: 200});
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "Invalid input"}, {status: 400});
    }
}


const insertArray = (role:any,perArr:any) => {
    const res = []
    for (const per of perArr) {
        res.push({
            id: faker.string.uuid(),
            role_id: role.id,
            permission_id: per.id,
            can_create: per.can_create,
            can_view: per.can_view,
            can_update: per.can_update,
            can_delete: per.can_delete,
            created_at: new Date(),
        })
    }
    return res ?? [] 
}