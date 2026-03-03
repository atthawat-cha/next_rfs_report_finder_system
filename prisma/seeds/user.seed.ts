import { PrismaClient, UserStatus } from "@/app/generated/prisma/client"
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

export async function seedUsers(prisma: PrismaClient) {

  const userRole = await prisma.roles.findFirst({
    where: {
      name: "User"
    }
  });

  const superAdminRole = await prisma.roles.findFirst({
    select: {
      id: true
    },
    where: {
      name: "Admin"
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

  const password = await bcrypt.hash("123456", 10)
  const adminUser = await prisma.users.createMany({
      data: [
        {
        id: faker.string.uuid(),
        username: "admin2",
        email: "admin2@example.com",
        password: password,
        first_name: "System",
        last_name: "Admin",
        status: UserStatus.ACTIVE,
        department_id: itDept?.id,
        role_id: superAdminRole?.id,
        updated_at: new Date()
      },
      {
        id: faker.string.uuid(),
        username: "user2",
        email: "user2@example.com",
        password: password,
        first_name: "System",
        last_name: "User",
        status: UserStatus.ACTIVE,
        role_id:userRole?.id,
        department_id: itDept?.id,
        updated_at: new Date()
      }
      ]
    });
  
    await prisma.user_roles.createMany({
      data: [
        {
        id: faker.string.uuid(),
        user_id: adminUser?.id,
        role_id: superAdminRole?.id
      },
      {
        id: faker.string.uuid(),
        user_id: adminUser?.id,
        role_id: userRole?.id
      }
      ],
      skipDuplicates: true
    });

  console.log("✅ Users seeded")
}
