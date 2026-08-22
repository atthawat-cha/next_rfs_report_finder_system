import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'


// Secoundary seed functions - most calls in main() below are commented out by
// default (see CLAUDE.md's Commands section); their imports are commented
// out here too so an unused-vars warning doesn't sit permanently on a step
// nobody has enabled. Uncomment both the import and the call to re-enable one.
// import { initSeed } from "./seeds/init.seed"; // All seed functions
// import { seedUsers } from "./seeds/user.seed"; // User seed
import { seedReports } from "./seeds/reports.seed"; // Reports seed
import { seedMenus } from "./seeds/menus.seed";
import { seedPermissions } from "./seeds/permission.seed";
import { seedRolePermission } from "./seeds/role_permission.seed";
// import { rolesSeed } from "./seeds/roles.seed";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // await initSeed(prisma);
  // await rolesSeed(prisma)
  // await seedUsers(prisma);
  await seedReports(prisma);
  await seedMenus(prisma);
  await seedPermissions(prisma);
  await seedRolePermission(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
