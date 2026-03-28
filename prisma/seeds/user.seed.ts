import { PrismaClient, UserStatus } from "@/app/generated/prisma/client"
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

export async function seedUsers(prisma: PrismaClient) {

  const userRole = await prisma.roles.findFirst({
    where: {
      name: "USER"
    }
  });

  const superAdminRole = await prisma.roles.findFirst({
    select: {
      id: true
    },
    where: {
      name: "ADMIN"
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

  if (!userRole || !superAdminRole || !itDept) {
    throw new Error("Missing roles or departments required to seed users.");
  }

  const password = await bcrypt.hash("123456", 10)
  const adminId = faker.string.uuid();
  const userId = faker.string.uuid();

  await prisma.users.createMany({
      data: [
        {
        id: adminId,
        username: "admin2",
        email: "admin2@example.com",
        password: password,
        first_name: "System",
        last_name: "Admin",
        status: UserStatus.ACTIVE,
        department_id: itDept.id,
        role_id: superAdminRole.id,
        updated_at: new Date()
      },
      {
        id: userId,
        username: "user2",
        email: "user2@example.com",
        password: password,
        first_name: "System",
        last_name: "User",
        status: UserStatus.ACTIVE,
        role_id: userRole.id,
        department_id: itDept.id,
        updated_at: new Date()
      }
      ]
    });
  
    await prisma.user_roles.createMany({
      data: [
        {
        id: faker.string.uuid(),
        user_id: adminId,
        role_id: superAdminRole.id
      },
      {
        id: faker.string.uuid(),
        user_id: adminId,
        role_id: userRole.id
      }
      ],
      skipDuplicates: true
    });

  console.log("✅ Users seeded")
}
