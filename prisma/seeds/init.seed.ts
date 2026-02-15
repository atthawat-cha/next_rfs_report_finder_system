import { PrismaClient, Prisma } from "../../app/generated/prisma/client";
import { AccessLevel, ReportStatus, NotificationType, ShareType, TicketPriority, TicketStatus, UserStatus } from "../../app/generated/prisma/client";
import 'dotenv/config'
import { faker } from "@faker-js/faker";
import bcrypt from 'bcryptjs';



export async function initSeed(prisma:PrismaClient) {
  
  console.log("Initailizetion Seeding database...");

    /* =========================
      1. ROLES
  ==========================*/
  const superAdminRole = await prisma.roles.create({
    data: {
      id: faker.string.uuid(),
      name: "SUPER_ADMIN",
      display_name: "Super Admin",
      is_system: true,
      updated_at: new Date()
    }
  });

  
  const userRole = await prisma.roles.create({
    data: {
      id: faker.string.uuid(),
      name: "USER",
      display_name: "User",
      updated_at: new Date()
    }
  });

  /* =========================
    2. PERMISSIONS
  ==========================*/
  const permissionsData = [
    { name: "user.create", display_name: "Create User", category: "User Management" },
    { name: "user.read", display_name: "View User", category: "User Management" },
    { name: "report.create", display_name: "Create Report", category: "Report Management" },
    { name: "report.read", display_name: "View Report", category: "Report Management" },
    { name: "report.download", display_name: "Download Report", category: "Report Management" },
    { name: "settings.manage", display_name: "Manage Settings", category: "System" }
  ];

  for (const perm of permissionsData) {
    const created = await prisma.permissions.create({
      data: {
        id: faker.string.uuid(),
        ...perm,
        updated_at: new Date()
      }
    });

    await prisma.role_permissions.create({
      data: {
        id: faker.string.uuid(),
        role_id: superAdminRole.id,
        permission_id: created.id
      }
    });
  }

  /* =========================
     3. DEPARTMENT
  ==========================*/
  const itDept = await prisma.departments.create({
    data: {
      id: faker.string.uuid(),
      name: "IT Department",
      code: "IT",
      updated_at: new Date()
    }
  });

  /* =========================
     4. USERS
  ==========================*/
  const passHash = await bcrypt.hashSync("123456", 10);

  const adminUser = await prisma.users.create({
    data:  {
      id: faker.string.uuid(),
      username: "admin",
      email: "admin@example.com",
      password: passHash, // "admin123",
      first_name: "System",
      last_name: "Admin",
      status: UserStatus.ACTIVE,
      department_id: itDept.id,
      updated_at: new Date()
    },
  });


  const normalUser = await prisma.users.create({
    data:  {
        id: faker.string.uuid(),
        username: "user",
        email: "user@example.com",
        password: passHash,
        first_name: "Demo",
        last_name: "User",
        status: UserStatus.ACTIVE,
        department_id: itDept.id,
        updated_at: new Date()
      }
  })

  await prisma.user_roles.createMany({
    data: [
      {
      id: faker.string.uuid(),
      user_id: adminUser.id,
      role_id: superAdminRole.id
      },
      {
        id: faker.string.uuid(),
        user_id: normalUser.id,
        role_id: userRole.id
      }
    ]
  });

  /* =========================
     5. CATEGORY
  ==========================*/
  const financeCategory = await prisma.categories.create({
    data: {
      id: faker.string.uuid(),
      name: "Finance",
      code: "FIN",
      updated_at: new Date()
    }
  });

  /* =========================
     6. TAG
  ==========================*/
  const monthlyTag = await prisma.tags.create({
    data: {
      id: faker.string.uuid(),
      name: "Monthly",
      slug: "monthly",
      updated_at: new Date()
    }
  });

  /* =========================
     7. REPORT
  ==========================*/
  const report = await prisma.reports.create({
    data: {
      id: faker.string.uuid(),
      code: "RPT-001",
      name_th: "รายงานการเงินประจำเดือน",
      name_en: "Monthly Financial Report",
      description: "Sample report for testing",
      file_path: "/uploads/rpt1.pdf",
      file_name: "rpt1.pdf",
      file_type: "pdf",
      file_size: BigInt(204800),
      category_id: financeCategory.id,
      department_id: itDept.id,
      created_by_id: adminUser.id,
      status: ReportStatus.PUBLISHED,
      access_level: AccessLevel.PUBLIC,
      published_at: new Date(),
      updated_at: new Date()
    }
  });

  /* =========================
     8. REPORT TAG
  ==========================*/
  await prisma.report_tags.create({
    data: {
      id: faker.string.uuid(),
      report_id: report.id,
      tag_id: monthlyTag.id
    }
  });

  /* =========================
     9. DOWNLOAD
  ==========================*/
  await prisma.downloads.create({
    data: {
      id: faker.string.uuid(),
      user_id: adminUser.id,
      report_id: report.id,
      ip_address: "127.0.0.1",
      user_agent: "Seed Script"
    }
  });

  /* =========================
     10. FAVORITE
  ==========================*/
  await prisma.favorites.create({
    data: {
      id: faker.string.uuid(),
      user_id: adminUser.id,
      report_id: report.id
    }
  });

  /* =========================
     11. NOTIFICATION
  ==========================*/
  await prisma.notifications.create({
    data: {
      id: faker.string.uuid(),
      user_id: adminUser.id,
      type: NotificationType.REPORT_NEW,
      title: "New Report Available",
      message: "A new financial report has been published."
    }
  });

  /* =========================
     12. ACTIVITY LOG
  ==========================*/
  await prisma.activity_logs.create({
    data: {
      id: faker.string.uuid(),
      user_id: adminUser.id,
      action: "CREATE",
      entity: "REPORT",
      entity_id: report.id,
      description: "Created Monthly Financial Report",
      ip_address: "127.0.0.1",
      user_agent: "Seed Script"
    }
  });

  /* =========================
     13. SUPPORT TICKET
  ==========================*/
  await prisma.support_tickets.create({
    data: {
      id: faker.string.uuid(),
      ticket_number: "TCK-0001",
      user_id: adminUser.id,
      subject: "Cannot download report",
      description: "Download button not working.",
      category: "Technical",
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      updated_at: new Date()
    }
  });

  console.log("✅ Seeding completed successfully!");
}


