import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { faker } from "@faker-js/faker";
import prisma from "./prisma";
import { getUploadRoot } from "./storage-path";
import { buildRouteRequest, routeParams } from "./test-helpers/route-request";
import type { UserSessionType } from "./types";

import { GET as browseGET } from "@/app/api/reports/browse/route";
import { GET as favoritesGET, POST as favoritesPOST } from "@/app/api/reports/favorites/route";
import { DELETE as favoriteDELETE } from "@/app/api/reports/favorites/[reportId]/route";
import { GET as reportGET } from "@/app/api/reports/[id]/route";
import { GET as reportDownloadGET } from "@/app/api/reports/[id]/download/route";
import { GET as fileDownloadGET } from "@/app/api/reports/[id]/files/[fileId]/download/route";
import { GET as filePreviewGET } from "@/app/api/reports/[id]/files/[fileId]/preview/route";

/**
 * Integration tests against the real dev DB - calls the actual route handler
 * functions (not HTTP) with a real signed auth-token cookie from
 * lib/auth.ts's createToken(), the regression net ของค้าง #13 should have
 * had from the start (00-progress.md). All fixtures are prefixed VITEST-6B-
 * and torn down in afterAll.
 *
 * Reports.delete cascades report_files/report_permissions/favorites/downloads
 * (all onDelete: Cascade in schema.prisma), so only reports + users + the
 * activity_logs rows this suite itself wrote need explicit cleanup.
 */
describe("route-handler auth/ACL matrix (ของค้าง #13 regression suite)", () => {
  let categoryId: string;
  let creatorId: string;

  let userRoleId: string;
  let adminRoleId: string;
  let superAdminRoleId: string;

  let userFixture: UserSessionType;
  let adminFixture: UserSessionType;
  let superAdminFixture: UserSessionType;
  /** Same real DB user as userFixture, but the JWT payload carries no role at all. */
  let roleNullUser: UserSessionType;

  let publicReportId: string;
  let restrictedNoGrantReportId: string;
  let restrictedWithGrantReportId: string;

  let publicReportFileId: string;
  let restrictedNoGrantReportFileId: string;
  let restrictedWithGrantReportFileId: string;

  const legacyRelPath = "vitest-6b/legacy.csv";
  const uploadRelPath = "vitest-6b/sample.csv";
  let legacyAbsPath: string;
  let uploadAbsDir: string;

  beforeAll(async () => {
    const category = await prisma.categories.findFirstOrThrow();
    categoryId = category.id;

    const userRole = await prisma.roles.findFirstOrThrow({ where: { name: "USER" } });
    const adminRole = await prisma.roles.findFirstOrThrow({ where: { name: "ADMIN" } });
    const superAdminRole = await prisma.roles.findFirstOrThrow({ where: { name: "SUPER_ADMIN" } });
    userRoleId = userRole.id;
    adminRoleId = adminRole.id;
    superAdminRoleId = superAdminRole.id;

    async function createFixtureUser(roleId: string, tag: string) {
      const suffix = faker.string.alphanumeric(8);
      return prisma.users.create({
        data: {
          id: faker.string.uuid(),
          username: `VITEST-6B-${tag}-${suffix}`,
          email: `vitest-6b-${tag}-${suffix}@example.com`,
          password: "not-a-real-hash",
          role_id: roleId,
          updated_at: new Date(),
        },
      });
    }

    const userRow = await createFixtureUser(userRoleId, "user");
    const adminRow = await createFixtureUser(adminRoleId, "admin");
    const superAdminRow = await createFixtureUser(superAdminRoleId, "superadmin");
    creatorId = userRow.id;

    userFixture = { id: userRow.id, username: userRow.username, roles: { id: userRoleId, name: "USER" } };
    adminFixture = { id: adminRow.id, username: adminRow.username, roles: { id: adminRoleId, name: "ADMIN" } };
    superAdminFixture = {
      id: superAdminRow.id,
      username: superAdminRow.username,
      roles: { id: superAdminRoleId, name: "SUPER_ADMIN" },
    };
    roleNullUser = { id: userRow.id, username: userRow.username, roles: undefined };

    // Fixture files on disk - legacy path (reports.file_path, always under
    // <cwd>/public regardless of UPLOAD_BASE_PATH - see the [id]/download
    // route's hardcoded PUBLIC_DIR) and the report_files-backed path (goes
    // through lib/storage-path.ts's configured upload root).
    legacyAbsPath = path.join(process.cwd(), "public", legacyRelPath);
    await fs.mkdir(path.dirname(legacyAbsPath), { recursive: true });
    await fs.writeFile(legacyAbsPath, "a,b\n1,2\n");

    const uploadRoot = await getUploadRoot();
    uploadAbsDir = path.join(uploadRoot, "vitest-6b");
    await fs.mkdir(uploadAbsDir, { recursive: true });
    await fs.writeFile(path.join(uploadRoot, uploadRelPath), "a,b\n1,2\n");

    async function createReport(codeTag: string, opts: { status: "PUBLISHED" | "DRAFT"; access_level: "PUBLIC" | "RESTRICTED" }) {
      return prisma.reports.create({
        data: {
          id: faker.string.uuid(),
          code: `VITEST-6B-${codeTag}-${faker.string.alphanumeric(8)}`,
          name_th: `vitest 6b fixture (${codeTag})`,
          file_path: legacyRelPath,
          file_name: "legacy.csv",
          file_type: "csv",
          file_size: BigInt(8),
          category_id: categoryId,
          created_by_id: creatorId,
          status: opts.status,
          access_level: opts.access_level,
          is_downloadable: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }

    async function createReportFile(reportId: string) {
      const file = await prisma.report_files.create({
        data: {
          id: faker.string.uuid(),
          report_id: reportId,
          file_kind: "SAMPLE_DATA",
          file_path: uploadRelPath,
          file_name: "sample.csv",
          file_type: "csv",
          file_size: BigInt(8),
          uploaded_by: creatorId,
          created_at: new Date(),
        },
      });
      return file.id;
    }

    const publicReport = await createReport("PUB", { status: "PUBLISHED", access_level: "PUBLIC" });
    const restrictedNoGrantReport = await createReport("RES-NOGRANT", { status: "PUBLISHED", access_level: "RESTRICTED" });
    const restrictedWithGrantReport = await createReport("RES-GRANT", { status: "PUBLISHED", access_level: "RESTRICTED" });

    publicReportId = publicReport.id;
    restrictedNoGrantReportId = restrictedNoGrantReport.id;
    restrictedWithGrantReportId = restrictedWithGrantReport.id;

    publicReportFileId = await createReportFile(publicReportId);
    restrictedNoGrantReportFileId = await createReportFile(restrictedNoGrantReportId);
    restrictedWithGrantReportFileId = await createReportFile(restrictedWithGrantReportId);

    await prisma.report_permissions.create({
      data: {
        id: faker.string.uuid(),
        report_id: restrictedWithGrantReportId,
        subject_type: "USER",
        subject_id: userFixture.id,
        can_view: true,
        can_edit: false,
        can_delete: false,
        can_favorite: true,
        can_export: true,
        can_print: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });

  afterAll(async () => {
    const reportIds = [publicReportId, restrictedNoGrantReportId, restrictedWithGrantReportId];
    const userIds = [userFixture.id, adminFixture.id, superAdminFixture.id];

    await prisma.activity_logs.deleteMany({ where: { entity_id: { in: reportIds } } });
    await prisma.activity_logs.deleteMany({ where: { user_id: { in: userIds } } });
    // Cascades report_files/report_permissions/favorites/downloads for these reports.
    await prisma.reports.deleteMany({ where: { id: { in: reportIds } } });
    // Cascades any remaining favorites/downloads by these users.
    await prisma.users.deleteMany({ where: { id: { in: userIds } } });

    await fs.rm(legacyAbsPath, { force: true });
    await fs.rm(uploadAbsDir, { recursive: true, force: true });
  });

  // --- shared call wrappers -------------------------------------------------

  async function callBrowse(user?: UserSessionType | null) {
    const req = await buildRouteRequest({ url: "http://localhost/api/reports/browse", user });
    return browseGET(req);
  }
  async function callFavoritesGet(user?: UserSessionType | null) {
    const req = await buildRouteRequest({ url: "http://localhost/api/reports/favorites", user });
    return favoritesGET(req);
  }
  async function callFavoritesPost(user: UserSessionType | null | undefined, reportId: string) {
    const req = await buildRouteRequest({
      method: "POST",
      url: "http://localhost/api/reports/favorites",
      user,
      body: { report_id: reportId },
    });
    return favoritesPOST(req);
  }
  async function callFavoriteDelete(user: UserSessionType | null | undefined, reportId: string) {
    const req = await buildRouteRequest({
      method: "DELETE",
      url: `http://localhost/api/reports/favorites/${reportId}`,
      user,
    });
    return favoriteDELETE(req, routeParams({ reportId }));
  }
  async function callReportDetail(user: UserSessionType | null | undefined, reportId: string) {
    const req = await buildRouteRequest({ url: `http://localhost/api/reports/${reportId}`, user });
    return reportGET(req, routeParams({ id: reportId }));
  }
  async function callReportDownload(user: UserSessionType | null | undefined, reportId: string) {
    const req = await buildRouteRequest({ url: `http://localhost/api/reports/${reportId}/download`, user });
    return reportDownloadGET(req, routeParams({ id: reportId }));
  }
  async function callFileDownload(user: UserSessionType | null | undefined, reportId: string, fileId: string) {
    const req = await buildRouteRequest({ url: `http://localhost/api/reports/${reportId}/files/${fileId}/download`, user });
    return fileDownloadGET(req, routeParams({ id: reportId, fileId }));
  }
  async function callFilePreview(user: UserSessionType | null | undefined, reportId: string, fileId: string) {
    const req = await buildRouteRequest({ url: `http://localhost/api/reports/${reportId}/files/${fileId}/preview`, user });
    return filePreviewGET(req, routeParams({ id: reportId, fileId }));
  }

  // --- 1. no cookie -> 401 everywhere ---------------------------------------

  describe("no cookie", () => {
    it("401s on every endpoint in the table", async () => {
      expect((await callBrowse(null)).status).toBe(401);
      expect((await callFavoritesGet(null)).status).toBe(401);
      expect((await callFavoritesPost(null, publicReportId)).status).toBe(401);
      expect((await callFavoriteDelete(null, publicReportId)).status).toBe(401);
      expect((await callReportDetail(null, publicReportId)).status).toBe(401);
      expect((await callReportDownload(null, publicReportId)).status).toBe(401);
      expect((await callFileDownload(null, publicReportId, publicReportFileId)).status).toBe(401);
      expect((await callFilePreview(null, publicReportId, publicReportFileId)).status).toBe(401);
    });
  });

  // --- 2. a user whose role is null -----------------------------------------

  describe("a user whose roles is null", () => {
    it("403s (not a crash) on every requireRole-gated endpoint", async () => {
      expect((await callBrowse(roleNullUser)).status).toBe(403);
      expect((await callFavoritesGet(roleNullUser)).status).toBe(403);
      expect((await callFavoritesPost(roleNullUser, publicReportId)).status).toBe(403);
      expect((await callFavoriteDelete(roleNullUser, publicReportId)).status).toBe(403);
      expect((await callReportDownload(roleNullUser, publicReportId)).status).toBe(403);
      expect((await callFileDownload(roleNullUser, publicReportId, publicReportFileId)).status).toBe(403);
      expect((await callFilePreview(roleNullUser, publicReportId, publicReportFileId)).status).toBe(403);
    });

    it("GET /api/reports/[id] has no tier gate at all (documented in CLAUDE.md) - it falls through to the same ACL resolution a non-admin gets, not a 403", async () => {
      const onPublic = await callReportDetail(roleNullUser, publicReportId);
      expect(onPublic.status).toBe(200);

      const onRestricted = await callReportDetail(roleNullUser, restrictedNoGrantReportId);
      expect(onRestricted.status).toBe(404);
    });
  });

  // --- 3. USER role ----------------------------------------------------------

  describe("USER role", () => {
    it("sees the PUBLIC report through every read/write path", async () => {
      const browse = await callBrowse(userFixture);
      expect(browse.status).toBe(200);
      const browseBody = await browse.json();
      expect(browseBody.data.map((r: { id: string }) => r.id)).toContain(publicReportId);

      const detail = await callReportDetail(userFixture, publicReportId);
      expect(detail.status).toBe(200);

      const favPost = await callFavoritesPost(userFixture, publicReportId);
      expect(favPost.status).toBe(200);
      const favGet = await callFavoritesGet(userFixture);
      expect((await favGet.json()).data.map((r: { id: string }) => r.id)).toContain(publicReportId);
      const favDelete = await callFavoriteDelete(userFixture, publicReportId);
      expect(favDelete.status).toBe(200);

      expect((await callReportDownload(userFixture, publicReportId)).status).toBe(200);
      expect((await callFileDownload(userFixture, publicReportId, publicReportFileId)).status).toBe(200);
      const preview = await callFilePreview(userFixture, publicReportId, publicReportFileId);
      expect(preview.status).toBe(200);
      expect((await preview.json()).data.headers).toEqual(["a", "b"]);
    });

    it("gets 404 (not 403) on a RESTRICTED report with no grant, on every read/download path", async () => {
      const browse = await callBrowse(userFixture);
      const browseBody = await browse.json();
      expect(browseBody.data.map((r: { id: string }) => r.id)).not.toContain(restrictedNoGrantReportId);

      expect((await callReportDetail(userFixture, restrictedNoGrantReportId)).status).toBe(404);
      expect((await callReportDownload(userFixture, restrictedNoGrantReportId)).status).toBe(404);
      expect((await callFileDownload(userFixture, restrictedNoGrantReportId, restrictedNoGrantReportFileId)).status).toBe(404);
      expect((await callFilePreview(userFixture, restrictedNoGrantReportId, restrictedNoGrantReportFileId)).status).toBe(404);
      expect((await callFavoritesPost(userFixture, restrictedNoGrantReportId)).status).toBe(403);
    });

    it("an individual grant unlocks a RESTRICTED report on every path", async () => {
      expect((await callReportDetail(userFixture, restrictedWithGrantReportId)).status).toBe(200);
      expect((await callReportDownload(userFixture, restrictedWithGrantReportId)).status).toBe(200);
      expect((await callFileDownload(userFixture, restrictedWithGrantReportId, restrictedWithGrantReportFileId)).status).toBe(200);
      expect((await callFilePreview(userFixture, restrictedWithGrantReportId, restrictedWithGrantReportFileId)).status).toBe(200);
      expect((await callFavoritesPost(userFixture, restrictedWithGrantReportId)).status).toBe(200);
      expect((await callFavoriteDelete(userFixture, restrictedWithGrantReportId)).status).toBe(200);
    });
  });

  // --- 4. ADMIN role (the ของค้าง #13 regression net) -------------------------

  describe("ADMIN role (plain ADMIN, not SUPER_ADMIN)", () => {
    it("gets a non-403 on every endpoint in the table, including a RESTRICTED report with no grant", async () => {
      const results = [
        (await callBrowse(adminFixture)).status,
        (await callFavoritesGet(adminFixture)).status,
        (await callFavoritesPost(adminFixture, restrictedNoGrantReportId)).status,
        (await callFavoriteDelete(adminFixture, restrictedNoGrantReportId)).status,
        (await callReportDetail(adminFixture, restrictedNoGrantReportId)).status,
        (await callReportDownload(adminFixture, restrictedNoGrantReportId)).status,
        (await callFileDownload(adminFixture, restrictedNoGrantReportId, restrictedNoGrantReportFileId)).status,
        (await callFilePreview(adminFixture, restrictedNoGrantReportId, restrictedNoGrantReportFileId)).status,
      ];
      expect(results).not.toContain(403);
    });

    it("POST /api/reports/favorites succeeds on a RESTRICTED report with no grant (the admin ACL bypass) but 403s - not 500s - on a report_id that does not exist", async () => {
      const onRestricted = await callFavoritesPost(adminFixture, restrictedNoGrantReportId);
      expect(onRestricted.status).toBe(200);

      const onMissing = await callFavoritesPost(adminFixture, faker.string.uuid());
      expect(onMissing.status).toBe(403);
    });

    it("bypasses ACL entirely on detail/download/file-download/file-preview for a RESTRICTED report with no grant", async () => {
      expect((await callReportDetail(adminFixture, restrictedNoGrantReportId)).status).toBe(200);
      expect((await callReportDownload(adminFixture, restrictedNoGrantReportId)).status).toBe(200);
      expect((await callFileDownload(adminFixture, restrictedNoGrantReportId, restrictedNoGrantReportFileId)).status).toBe(200);
      expect((await callFilePreview(adminFixture, restrictedNoGrantReportId, restrictedNoGrantReportFileId)).status).toBe(200);
    });
  });

  // --- 5. SUPER_ADMIN role ----------------------------------------------------

  describe("SUPER_ADMIN role", () => {
    it("gets the same non-403 / ACL-bypass treatment as ADMIN", async () => {
      const results = [
        (await callBrowse(superAdminFixture)).status,
        (await callFavoritesGet(superAdminFixture)).status,
        (await callReportDetail(superAdminFixture, restrictedNoGrantReportId)).status,
        (await callReportDownload(superAdminFixture, restrictedNoGrantReportId)).status,
        (await callFileDownload(superAdminFixture, restrictedNoGrantReportId, restrictedNoGrantReportFileId)).status,
        (await callFilePreview(superAdminFixture, restrictedNoGrantReportId, restrictedNoGrantReportFileId)).status,
      ];
      expect(results).not.toContain(403);
      expect((await callReportDetail(superAdminFixture, restrictedNoGrantReportId)).status).toBe(200);
    });
  });
});
