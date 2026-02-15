import { PrismaClient } from "@/app/generated/prisma/client";
import { faker } from "@faker-js/faker";


export async function rolesSeed(prisma: PrismaClient) {

    console.log("Roles Seeding Start...........");

    const rolesData = [
      {
        name: "SUPER_ADMIN",
        display_name: "Super Admin",
        is_system: true
      },
      {
        name: "ADMIN",
        display_name: "Admin",
        is_system: false
      },
      {
        name: "USER",
        display_name: "User",
        is_system: false
      },

    ]

  /* =========================
    1. ROLES
  ==========================*/
  for (const role of rolesData) {
    await prisma.roles.create({
      data: {
        id: faker.string.uuid(),
        name: role.name,
        display_name: role.display_name,
        is_system: role.is_system,
        updated_at: new Date()
      }
    });
  }

  console.log("Roles Seeding Completed...........");
}