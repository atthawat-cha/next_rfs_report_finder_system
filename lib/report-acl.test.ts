import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { faker } from "@faker-js/faker";
import prisma from "./prisma";
import { resolveReportAcl, visibleReportIdsFor } from "./report-acl";
import type { UserSessionType } from "./types";

/**
 * Integration tests against the real dev DB - resolveReportAcl/visibleReportIdsFor
 * query report_permissions/reports directly, they aren't pure functions to mock.
 * All fixtures are prefixed VITEST- and cleaned up in afterEach/afterAll so runs
 * are independent and repeatable. Cases mirror Phase 2a's original manual
 * verification (document/phase2-plan.md sub-phase 2a).
 */
describe("lib/report-acl", () => {
  let categoryId: string;
  let departmentId: string | null;
  let creatorId: string;
  let roleId: string;
  let userA: UserSessionType;
  let publicReportId: string;

  beforeAll(async () => {
    const category = await prisma.categories.findFirstOrThrow();
    const department = await prisma.departments.findFirst();
    const creator = await prisma.users.findFirstOrThrow();
    const role = await prisma.roles.findFirstOrThrow({ where: { name: "USER" } });

    categoryId = category.id;
    departmentId = department?.id ?? null;
    creatorId = creator.id;
    roleId = role.id;
    userA = { id: faker.string.uuid(), roles: { id: roleId, name: "USER" } };

    const report = await prisma.reports.create({
      data: {
        id: faker.string.uuid(),
        code: `VITEST-ACL-PUB-${faker.string.alphanumeric(8)}`,
        name_th: "vitest fixture (public/published)",
        file_path: "/vitest/none",
        file_name: "none",
        file_type: "none",
        file_size: BigInt(0),
        category_id: categoryId,
        department_id: departmentId,
        created_by_id: creatorId,
        status: "PUBLISHED",
        access_level: "PUBLIC",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    publicReportId = report.id;
  });

  afterAll(async () => {
    await prisma.reports.delete({ where: { id: publicReportId } });
  });

  /** A fresh PRIVATE+DRAFT report per test, so grant tests never interfere with each other. */
  async function createPrivateDraftReport(): Promise<string> {
    const report = await prisma.reports.create({
      data: {
        id: faker.string.uuid(),
        code: `VITEST-ACL-PRIV-${faker.string.alphanumeric(8)}`,
        name_th: "vitest fixture (private/draft)",
        file_path: "/vitest/none",
        file_name: "none",
        file_type: "none",
        file_size: BigInt(0),
        category_id: categoryId,
        department_id: departmentId,
        created_by_id: creatorId,
        status: "DRAFT",
        access_level: "PRIVATE",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return report.id;
  }

  describe("resolveReportAcl", () => {
    it("grants view/favorite/export/print (not edit/delete) for a PUBLIC+PUBLISHED report with no explicit grant", async () => {
      const acl = await resolveReportAcl(publicReportId, userA);
      expect(acl).toEqual({
        can_view: true,
        can_edit: false,
        can_delete: false,
        can_favorite: true,
        can_export: true,
        can_print: true,
      });
    });

    describe("against a PRIVATE+DRAFT report", () => {
      let reportId: string;

      beforeEach(async () => {
        reportId = await createPrivateDraftReport();
      });

      afterEach(async () => {
        await prisma.report_permissions.deleteMany({ where: { report_id: reportId } });
        await prisma.reports.delete({ where: { id: reportId } });
      });

      it("denies everything with no grant at all", async () => {
        const acl = await resolveReportAcl(reportId, userA);
        expect(acl).toEqual({
          can_view: false,
          can_edit: false,
          can_delete: false,
          can_favorite: false,
          can_export: false,
          can_print: false,
        });
      });

      it("a role grant overrides the access_level fallback", async () => {
        await prisma.report_permissions.create({
          data: {
            id: faker.string.uuid(),
            report_id: reportId,
            subject_type: "ROLE",
            subject_id: roleId,
            can_view: true,
            can_edit: false,
            can_delete: false,
            can_favorite: false,
            can_export: false,
            can_print: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        const acl = await resolveReportAcl(reportId, userA);
        expect(acl.can_view).toBe(true);
      });

      it("an individual grant overrides a role grant on the same report", async () => {
        await prisma.report_permissions.create({
          data: {
            id: faker.string.uuid(),
            report_id: reportId,
            subject_type: "ROLE",
            subject_id: roleId,
            can_view: true,
            can_edit: false,
            can_delete: false,
            can_favorite: false,
            can_export: false,
            can_print: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
        await prisma.report_permissions.create({
          data: {
            id: faker.string.uuid(),
            report_id: reportId,
            subject_type: "USER",
            subject_id: userA.id,
            can_view: true,
            can_edit: true,
            can_delete: false,
            can_favorite: false,
            can_export: false,
            can_print: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        // Role grant says can_edit=false, individual grant says true - individual must win.
        const acl = await resolveReportAcl(reportId, userA);
        expect(acl.can_edit).toBe(true);
      });
    });
  });

  describe("visibleReportIdsFor", () => {
    it("includes a PUBLIC+PUBLISHED report for any user", async () => {
      const ids = await visibleReportIdsFor(userA);
      expect(ids).toContain(publicReportId);
    });

    describe("against a PRIVATE+DRAFT report", () => {
      let reportId: string;

      beforeEach(async () => {
        reportId = await createPrivateDraftReport();
      });

      afterEach(async () => {
        await prisma.report_permissions.deleteMany({ where: { report_id: reportId } });
        await prisma.reports.delete({ where: { id: reportId } });
      });

      it("excludes it for a user with no grant at all", async () => {
        const ids = await visibleReportIdsFor(userA);
        expect(ids).not.toContain(reportId);
      });

      it("includes it once a role can_view grant exists for the user's role", async () => {
        await prisma.report_permissions.create({
          data: {
            id: faker.string.uuid(),
            report_id: reportId,
            subject_type: "ROLE",
            subject_id: roleId,
            can_view: true,
            can_edit: false,
            can_delete: false,
            can_favorite: false,
            can_export: false,
            can_print: false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        const ids = await visibleReportIdsFor(userA);
        expect(ids).toContain(reportId);
      });
    });
  });
});
