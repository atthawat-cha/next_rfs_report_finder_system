import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { AccessLevel, FileKind, PrismaClient, ReportOutputType, ReportStatus } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import { getUploadRoot } from "../lib/storage-path";
import {
  E2E_ADMIN_USERNAME,
  E2E_ADMIN_PASSWORD,
  E2E_REPORT_CODE,
  E2E_FILE_RELATIVE_PATH,
  E2E_DEPARTMENT_CODE,
  E2E_DEPARTMENT_NAME,
  E2E_CATEGORY_CODE,
  E2E_CATEGORY_NAME,
} from "./e2e-constants";

const E2E_FILE_CONTENT = Buffer.from(
  "%PDF-1.4\n% Playwright E2E fixture — not a real PDF, just non-empty bytes for a download-response check.\n"
);

/**
 * Minimal seed for a fresh CI database — not a substitute for prisma/seed.ts
 * (which seeds a full realistic dataset for local dev). Creates the bare rows
 * lib/report-acl.test.ts needs via findFirstOrThrow (role "USER", one
 * category, one user), plus the ADMIN/SUPER_ADMIN roles and one user per
 * role lib/reports-route-acl.test.ts's role matrix needs (Phase 6b), plus
 * (Phase 12a) one real-login admin and one downloadable report for the
 * Playwright E2E suite — a fresh CI database only has migrations applied, no
 * roles at all, so these suites would otherwise have nothing to
 * findFirstOrThrow / log in as / search for. Skips creation if rows already
 * exist so it's safe to re-run.
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

  const e2eAdmin =
    (await prisma.users.findFirst({ where: { username: E2E_ADMIN_USERNAME } })) ??
    (await prisma.users.create({
      data: {
        id: faker.string.uuid(),
        username: E2E_ADMIN_USERNAME,
        email: `${E2E_ADMIN_USERNAME}@example.com`,
        password: await bcrypt.hash(E2E_ADMIN_PASSWORD, 10),
        role_id: superAdminRole.id,
        updated_at: new Date(),
      },
    }));

  const e2eDepartment =
    (await prisma.departments.findFirst({ where: { code: E2E_DEPARTMENT_CODE } })) ??
    (await prisma.departments.create({
      data: {
        id: faker.string.uuid(),
        name: E2E_DEPARTMENT_NAME,
        code: E2E_DEPARTMENT_CODE,
        updated_at: new Date(),
      },
    }));

  const e2eCategory =
    (await prisma.categories.findFirst({ where: { code: E2E_CATEGORY_CODE } })) ??
    (await prisma.categories.create({
      data: {
        id: faker.string.uuid(),
        name: E2E_CATEGORY_NAME,
        code: E2E_CATEGORY_CODE,
        updated_at: new Date(),
      },
    }));

  const existingE2eReport = await prisma.reports.findFirst({ where: { code: E2E_REPORT_CODE } });
  if (!existingE2eReport) {
    // Write real bytes to disk under whatever root lib/storage-path.ts's
    // getUploadRoot() resolves to (the UPLOAD_BASE_PATH setting, or its
    // default) so the download route's storage.read() call finds a real
    // file, not just DB metadata. Resolving through the same function keeps
    // this in sync regardless of what the default is.
    const absoluteFilePath = path.join(await getUploadRoot(), E2E_FILE_RELATIVE_PATH);
    await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
    await fs.writeFile(absoluteFilePath, E2E_FILE_CONTENT);

    const e2eReport = await prisma.reports.create({
      data: {
        id: faker.string.uuid(),
        code: E2E_REPORT_CODE,
        name_th: "รายงานทดสอบ E2E",
        name_en: "E2E Seeded Report",
        description: "Fixture report for Playwright E2E specs (Phase 12a) — do not edit in dev.",
        file_path: E2E_FILE_RELATIVE_PATH,
        file_name: "blank-form.pdf",
        file_type: "pdf",
        file_size: BigInt(E2E_FILE_CONTENT.byteLength),
        category_id: e2eCategory.id,
        department_id: e2eDepartment.id,
        created_by_id: e2eAdmin.id,
        status: ReportStatus.PUBLISHED,
        access_level: AccessLevel.PUBLIC,
        output_type: ReportOutputType.PRINT_FORM,
        is_downloadable: true,
        is_editable: true,
        published_at: new Date(),
        updated_at: new Date(),
      },
    });

    await prisma.report_files.create({
      data: {
        id: faker.string.uuid(),
        report_id: e2eReport.id,
        file_kind: FileKind.BLANK_FORM,
        file_path: E2E_FILE_RELATIVE_PATH,
        file_name: "blank-form.pdf",
        file_type: "pdf",
        file_size: BigInt(E2E_FILE_CONTENT.byteLength),
        uploaded_by: e2eAdmin.id,
        is_current: true,
      },
    });
  }

  console.log(
    `CI seed ready: role=${userRole.id} category=${category.id} user=${user.id} ` +
      `adminRole=${adminRole.id} adminUser=${adminUser.id} ` +
      `superAdminRole=${superAdminRole.id} superAdminUser=${superAdminUser.id} ` +
      `e2eAdmin=${e2eAdmin.id} e2eDepartment=${e2eDepartment.id} e2eCategory=${e2eCategory.id} e2eReportCode=${E2E_REPORT_CODE}`
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
