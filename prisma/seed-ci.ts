import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

/**
 * Minimal seed for a fresh CI database — not a substitute for prisma/seed.ts
 * (which seeds a full realistic dataset for local dev). Creates the bare rows
 * lib/report-acl.test.ts needs via findFirstOrThrow (role "USER", one
 * category, one user), plus the ADMIN/SUPER_ADMIN roles and one user per
 * role lib/reports-route-acl.test.ts's role matrix needs (Phase 6b) — a
 * fresh CI database only has migrations applied, no roles at all, so that
 * suite would otherwise have nothing to findFirstOrThrow. Skips creation if
 * rows already exist so it's safe to re-run.
 */
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  async function findOrCreateRole(name: string) {
    return (
      (await prisma.roles.findFirst({ where: { name } })) ??
      (await prisma.roles.create({
        data: {
          id: faker.string.uuid(),
          name,
          display_name: name.charAt(0) + name.slice(1).toLowerCase(),
          updated_at: new Date(),
        },
      }))
    );
  }

  async function findOrCreateUserForRole(roleId: string, username: string) {
    return (
      (await prisma.users.findFirst({ where: { username } })) ??
      (await prisma.users.create({
        data: {
          id: faker.string.uuid(),
          username,
          email: `${username}@example.com`,
          password: "not-a-real-hash",
          role_id: roleId,
          updated_at: new Date(),
        },
      }))
    );
  }

  const userRole = await findOrCreateRole("USER");
  const adminRole = await findOrCreateRole("ADMIN");
  const superAdminRole = await findOrCreateRole("SUPER_ADMIN");

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
    (await findOrCreateUserForRole(userRole.id, "ci-fixture-user"));
  const adminUser = await findOrCreateUserForRole(adminRole.id, "ci-fixture-admin");
  const superAdminUser = await findOrCreateUserForRole(superAdminRole.id, "ci-fixture-super-admin");

  console.log(
    `CI seed ready: role=${userRole.id} category=${category.id} user=${user.id} ` +
      `adminRole=${adminRole.id} adminUser=${adminUser.id} ` +
      `superAdminRole=${superAdminRole.id} superAdminUser=${superAdminUser.id}`
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
