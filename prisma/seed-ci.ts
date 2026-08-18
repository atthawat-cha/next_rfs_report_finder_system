import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

/**
 * Minimal seed for a fresh CI database — not a substitute for prisma/seed.ts
 * (which seeds a full realistic dataset for local dev). This only creates the
 * bare rows lib/report-acl.test.ts needs via findFirstOrThrow: one role named
 * "USER", one category, one user to act as a report's created_by_id.
 * Skips creation if rows already exist so it's safe to re-run.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const userRole =
    (await prisma.roles.findFirst({ where: { name: "USER" } })) ??
    (await prisma.roles.create({
      data: {
        id: faker.string.uuid(),
        name: "USER",
        display_name: "User",
        updated_at: new Date(),
      },
    }));

  const category =
    (await prisma.categories.findFirst()) ??
    (await prisma.categories.create({
      data: {
        id: faker.string.uuid(),
        name: "CI Fixture Category",
        code: "CI-FIXTURE",
        updated_at: new Date(),
      },
    }));

  const user =
    (await prisma.users.findFirst()) ??
    (await prisma.users.create({
      data: {
        id: faker.string.uuid(),
        username: "ci-fixture-user",
        email: "ci-fixture-user@example.com",
        password: "not-a-real-hash",
        role_id: userRole.id,
        updated_at: new Date(),
      },
    }));

  console.log(`CI seed ready: role=${userRole.id} category=${category.id} user=${user.id}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
