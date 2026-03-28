import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, routeAcceptted } from '@/lib/auth';
import z from 'zod';
import { faker } from '@faker-js/faker';
import { buildRolePermissionInsert } from '@/lib/user-management';

// GET all roles
export async function GET(req: NextRequest) {
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

        const roles = await prisma.roles.findMany({
            select: {
                _count: {
                    select: { users: true }
                },
                id: true,
                name: true,
                display_name: true,
                description: true,
                role_permissions: {
                    select: {
                        id: true,
                        permission_id: true,
                        can_create: true,
                        can_view: true,
                        can_update: true,
                        can_delete: true,
                        permissions: {
                            select: {
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
            return NextResponse.json({ error: "Roles not found" }, { status: 404 });
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
    role: z.object({
        name: z.string().min(1, 'กรุณากรอกชื่อ'),
        display_name: z.string().min(1, 'กรุณากรอกชื่อแสดง')
    }),
    // permission : z.array(z.string())
})

export async function POST(req: NextRequest) {

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

        // Validate request body
        const body = await req.json();

        if (!body) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const roleValidate = roleZod.parse(body);
        // const permissionValidate = permissionZod.parse(permissionData);
        if (!roleValidate) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        /**
         * 
         * - Create Role
         * - Get ID Role for insert to role_permissions
         * - Get all ID permission
         * - Create role_permissions & Insert action
         */

        // Vlidate Data
        await prisma.$transaction(async (prisma) => {
            const permissions = await prisma.permissions.findMany({
                select: {
                    id: true,
                    name: true,
                    display_name: true,
                    category: true
                }
            });

            const role = await prisma.roles.create({
                data: {
                    id: faker.string.uuid(),
                    name: roleValidate.role.name,
                    display_name: roleValidate.role.display_name,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                select: {
                    id: true
                }
            })
            const rp = buildRolePermissionInsert(role.id, permissions, body.permissions)
            // console.log(rp);

            await prisma.role_permissions.createMany({
                data: rp
            })
        })
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
}

