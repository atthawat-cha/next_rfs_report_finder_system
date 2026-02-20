import { PrismaClient, Prisma } from "../../app/generated/prisma/client";
import { AccessLevel, ReportStatus, NotificationType, ShareType, TicketPriority, TicketStatus, UserStatus } from "../../app/generated/prisma/client";
import 'dotenv/config'
import { faker } from "@faker-js/faker";
import bcrypt from 'bcryptjs';



export async function initSeed(prisma:PrismaClient) {
  
  console.log("🌱 Start seeding...")

  /* -------------------- DEPARTMENTS -------------------- */
  const headDept = await prisma.departments.create({
    data: {
      id: faker.string.uuid(),
      name: "Head Office",
      code: "HO",
      updated_at: new Date()
    }
  })

  const itDept = await prisma.departments.create({
    data: {
      id: faker.string.uuid(),
      name: "IT Department",
      code: "IT",
      parent_id: headDept.id,
      updated_at: new Date()
    }
  })

  /* -------------------- ROLES -------------------- */
  const adminRole = await prisma.roles.create({
    data: {
      id: faker.string.uuid(),
      name: "ADMIN",
      display_name: "Administrator",
      is_system: true,
      updated_at: new Date()
    }
  })

  const userRole = await prisma.roles.create({
    data: {
      id: faker.string.uuid(),
      name: "USER",
      display_name: "General User",
      updated_at: new Date()
    }
  })

  /* -------------------- PERMISSIONS -------------------- */
  const manageReports = await prisma.permissions.create({
    data: {
      id: "MANAGE_REPORTS",
      name: "MANAGE_REPORTS",
      display_name: "Manage Reports",
      category: "REPORT",
      updated_at: new Date()
    }
  })

  const viewReports = await prisma.permissions.create({
    data: {
      id: "VIEW_REPORTS",
      name: "VIEW_REPORTS",
      display_name: "View Reports",
      category: "REPORT",
      updated_at: new Date()
    }
  })

  /* -------------------- ROLE PERMISSIONS -------------------- */
  await prisma.role_permissions.createMany({
    data: [
      {
        id: faker.string.uuid(),
        role_id: adminRole.id,
        permission_id: manageReports.id,
      },
      {
        id: faker.string.uuid(),
        role_id: adminRole.id,
        permission_id: viewReports.id,
      },
      {
        id: faker.string.uuid(),
        role_id: userRole.id,
        permission_id: viewReports.id,
      }
    ]
  })

  /* -------------------- USERS -------------------- */
  const password = await bcrypt.hash("123456", 10)

  const adminUser = await prisma.users.create({
    data: {
      id: faker.string.uuid(),
      username: "admin",
      email: "admin@example.com",
      password,
      first_name: "System",
      last_name: "Admin",
      department_id: itDept.id,
      status: UserStatus.ACTIVE,
      updated_at: new Date()
    }
  })

  const normalUser = await prisma.users.create({
    data: {
      id: faker.string.uuid(),
      username: "user1",
      email: "user1@example.com",
      password,
      first_name: "John",
      last_name: "Doe",
      department_id: itDept.id,
      updated_at: new Date()
    }
  })

  /* -------------------- USER ROLES -------------------- */
  await prisma.user_roles.createMany({
    data: [
      { id: faker.string.uuid(), user_id: adminUser.id, role_id: adminRole.id },
      { id: faker.string.uuid(), user_id: normalUser.id, role_id: userRole.id }
    ]
  })

  /* -------------------- CATEGORIES -------------------- */
  const financeCat = await prisma.categories.create({
    data: {
      id: faker.string.uuid(),
      name: "Finance",
      code: "FIN",
      updated_at: new Date()
    }
  })

  const monthlyCat = await prisma.categories.create({
    data: {
      id: faker.string.uuid(),
      name: "Monthly Report",
      code: "FIN-MONTH",
      parent_id: financeCat.id,
      updated_at: new Date()
    }
  })

  /* -------------------- TAGS -------------------- */
  const tag1 = await prisma.tags.create({
    data: {
      id: faker.string.uuid(),
      name: "2026",
      slug: "2026",
      updated_at: new Date()
    }
  })

  const tag2 = await prisma.tags.create({
    data: {
      id: faker.string.uuid(),
      name: "Revenue",
      slug: "revenue",
      updated_at: new Date()
    }
  })

  /* -------------------- REPORT -------------------- */
  const report = await prisma.reports.create({
    data: {
      id: faker.string.uuid(),
      code: "RPT-001",
      name_th: "รายงานรายได้ประจำเดือน",
      name_en: "Monthly Revenue Report",
      file_path: "/reports/monthly.pdf",
      file_name: "monthly.pdf",
      file_type: "application/pdf",
      file_size: BigInt(204800),
      category_id: monthlyCat.id,
      department_id: itDept.id,
      created_by_id: adminUser.id,
      status: ReportStatus.PUBLISHED,
      access_level: AccessLevel.PUBLIC,
      published_at: new Date(),
      updated_at: new Date()
    }
  })

  /* -------------------- REPORT VERSION -------------------- */
  await prisma.report_versions.create({
    data: {
      id: faker.string.uuid(),
      report_id: report.id,
      version: "1.0",
      file_path: "/reports/monthly_v1.pdf",
      file_name: "monthly_v1.pdf",
      file_size: BigInt(204800),
      created_by: adminUser.id
    }
  })

  /* -------------------- REPORT TAG -------------------- */
  await prisma.report_tags.createMany({
    data: [
      { id: faker.string.uuid(), report_id: report.id, tag_id: tag1.id },
      { id: faker.string.uuid(), report_id: report.id, tag_id: tag2.id }
    ]
  })

  /* -------------------- FAVORITE -------------------- */
  await prisma.favorites.create({
    data: {
      id: faker.string.uuid(),
      user_id: normalUser.id,
      report_id: report.id
    }
  })

  /* -------------------- DOWNLOAD -------------------- */
  await prisma.downloads.create({
    data: {
      id: faker.string.uuid(),
      user_id: normalUser.id,
      report_id: report.id,
      ip_address: "127.0.0.1",
      user_agent: "Mozilla/5.0"
    }
  })

  /* -------------------- NOTIFICATION -------------------- */
  await prisma.notifications.create({
    data: {
      id: faker.string.uuid(),
      user_id: normalUser.id,
      type: NotificationType.REPORT_NEW,
      title: "New Report Published",
      message: "Monthly Revenue Report is available."
    }
  })

  /* -------------------- ACTIVITY LOG -------------------- */
  await prisma.activity_logs.create({
    data: {
      id: faker.string.uuid(),
      user_id: normalUser.id,
      action: "DOWNLOAD",
      entity: "REPORT",
      entity_id: report.id,
      description: "Downloaded monthly report",
      ip_address: "127.0.0.1",
      user_agent: "Mozilla/5.0"
    }
  })

  /* -------------------- SUPPORT TICKET -------------------- */
  await prisma.support_tickets.create({
    data: {
      id: faker.string.uuid(),
      ticket_number: "TCK-0001",
      user_id: normalUser.id,
      subject: "Cannot download report",
      description: "File download fails",
      category: "REPORT",
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      updated_at: new Date()
    }
  })

  /* -------------------- SETTINGS -------------------- */
  await prisma.settings.create({
    data: {
      id: faker.string.uuid(),
      key: "SYSTEM_NAME",
      value: "Report Management System",
      type: "STRING",
      category: "SYSTEM",
      is_public: true,
      updated_at: new Date()
    }
  })

  console.log("✅ Seeding completed.")
}


