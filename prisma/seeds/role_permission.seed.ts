import { PrismaClient, Prisma } from "../../app/generated/prisma/client";
import "dotenv/config";
import { faker } from "@faker-js/faker";

export async function seedRolePermission(prisma: PrismaClient) {
    
    console.log("Role Permission Seeding Start...........");
    // get roles data for generate mapping
    const roles = await prisma.roles.findMany({
        select:{
            id: true,
            name: true
        }
    });

    // get permissions data for generate mapping
    const permissions = await prisma.permissions.findMany({
        select:{
            id: true,
        }   
    });

    const role_permissions = roles.flatMap((role) => {
        const isAdmin = (role.name).toLocaleLowerCase() === "admin";
        return permissions.map((permission) => ({
            id: faker.string.uuid(),
            role_id: role.id,
            permission_id: permission.id,
            can_create: isAdmin ? true : faker.datatype.boolean(),
            can_view: isAdmin ? true : faker.datatype.boolean(),
            can_update: isAdmin ? true : faker.datatype.boolean(),
            can_delete: isAdmin ? true : faker.datatype.boolean(),
            created_at: new Date()
        }))
    })

    await prisma.role_permissions.createMany({
        data: role_permissions
    })

    console.log("Role Permission Seeding End...........");

}