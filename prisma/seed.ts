import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { AccessLevel, ReportStatus,UserStatus } from "../app/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'


// Secoundary seed functions
import { initSeed } from "./seeds/init.seed"; // All seed functions
import { seedUsers } from "./seeds/user.seed"; // User seed
import { seedReports } from "./seeds/reports.seed"; // Reports seed

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // await initSeed(prisma);
  // await seedUsers(prisma);
  await seedReports(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
