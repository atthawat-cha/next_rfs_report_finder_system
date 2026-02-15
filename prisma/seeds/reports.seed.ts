import { AccessLevel, PrismaClient, ReportStatus, UserStatus } from "@/app/generated/prisma/client"
import { faker } from '@faker-js/faker';


export async function seedReports(prisma: PrismaClient) {

    console.log("Reports Seeding Start...........");
    const adminUser = await prisma.users.findFirst({
      select: {
        id: true
      },
      where: {
        username: "admin"
      }
    });

    const itDept = await prisma.departments.findFirst({
      select: {
        id: true
      },
      where: {
        code: "IT"
      }
    });

    const financeCategory = await prisma.categories.findFirst({
      select: {
        id: true
      },
      where: {
        code: "FIN"
      }
    });


    const reportsData = [
      {
        id: faker.string.uuid(),
        code: "RPT-001",
        name_th: "รายงานการเงินประจำเดือน",
        name_en: "Monthly Financial Report",
        description: "Sample report for testing",
        file_path: "/uploads/rpt1.pdf",
        file_name: "rpt1.pdf",
        file_type: "pdf",
        file_size: BigInt(204800),
        category_id: financeCategory?.id,
        department_id: itDept?.id,
        created_by_id: adminUser?.id,
        status: ReportStatus.PUBLISHED,
        access_level: AccessLevel.PUBLIC,
        published_at: new Date(),
        updated_at: new Date()
      },
      {
        id: faker.string.uuid(),
        code: "RPT-002",
        name_th: "รายงานการเงินประจำเดือน",
        name_en: "Monthly Financial Report",
        description: "Sample report for testing",
        file_path: "/uploads/rpt2.pdf",
        file_name: "rpt2.pdf",
        file_type: "pdf",
        file_size: BigInt(204800),
        category_id: financeCategory?.id,
        department_id: itDept?.id,
        created_by_id: adminUser?.id,
        status: ReportStatus.PUBLISHED,
        access_level: AccessLevel.PUBLIC,
        published_at: new Date(),
        updated_at: new Date()
      },
      {
        id: faker.string.uuid(),
        code: "RPT-003",
        name_th: "รายงานการเงินประจำเดือน",
        name_en: "Monthly Financial Report",
        description: "Sample report for testing",
        file_path: "/uploads/rpt3.pdf",
        file_name: "rpt3.pdf",
        file_type: "pdf",
        file_size: BigInt(204800),
        category_id: financeCategory?.id,
        department_id: itDept?.id,
        created_by_id: adminUser?.id,
        status: ReportStatus.PUBLISHED,
        access_level: AccessLevel.PUBLIC,
        published_at: new Date(),
        updated_at: new Date()
      }
    ];

    /* =========================
      7. REPORT
    ==========================*/
    await prisma.reports.deleteMany()

    for (const report of reportsData) {
      await prisma.reports.createMany({
        data: {
          ...report
        }
      });
    }

    console.log("Reports Seeding End...........");
}