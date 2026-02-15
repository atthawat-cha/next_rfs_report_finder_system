import { PrismaClient, UserStatus } from "@/app/generated/prisma/client"
import { faker } from '@faker-js/faker';

export async function seedUsers(prisma: PrismaClient) {

  const userRole = await prisma.roles.findFirst({
    where: {
      name: "user"
    }
  });

  const superAdminRole = await prisma.roles.findFirst({
    select: {
      id: true
    },
    where: {
      name: "admin"
    }
  });

  const itDept = await prisma.departments.findFirst({
    select:{
      id: true
    },
    where: {
      code: "IT"
    }
  });

  const adminUser = await prisma.users.createMany({
      data: [
        {
        id: faker.string.uuid(),
        username: "admin",
        email: "admin@example.com",
        password: "admin123",
        first_name: "System",
        last_name: "Admin",
        status: UserStatus.ACTIVE,
        department_id: itDept.id,
        updated_at: new Date()
      },
      {
        id: faker.string.uuid(),
        username: "user",
        email: "user@example.com",
        password: "user123",
        first_name: "System",
        last_name: "User",
        status: UserStatus.ACTIVE,
        department_id: itDept.id,
        updated_at: new Date()
      }
      ]
    });
  
    await prisma.user_roles.createMany({
      data: [
        {
        id: faker.string.uuid(),
        user_id: adminUser.id,
        role_id: superAdminRole.id
      },
      {
        id: faker.string.uuid(),
        user_id: adminUser.id,
        role_id: userRole.id
      }
      ],
      skipDuplicates: true
    });

  console.log("✅ Users seeded")
}
