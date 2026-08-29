import fs from "fs/promises";
import path from "path";
import { storage } from "@/lib/storage";

const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * reports.file_path predates the configurable UPLOAD_BASE_PATH storage root
 * (system-audit-2026-08-30.md item 2 / Phase 16b): some rows point at
 * assest/report-files/... (migrated out of public/ along with report_files),
 * others still point at content that always lived under public/ (e.g.
 * /uploads/*, /assest/uploads/*) and was never part of the ACL-bypass being
 * fixed. Try the configured storage root first, fall back to a direct
 * public/ read so neither class of existing row breaks. Used by every route
 * that still reads reports.file_path directly: GET /api/reports/[id]/download,
 * GET /api/reports/[id]/thumbnail, GET /api/shares/[token]/download.
 */
export async function readReportFileWithLegacyFallback(relPath: string): Promise<Buffer> {
  try {
    return await storage.read(relPath);
  } catch {
    const normalized = relPath.replace(/^[/\\]+/, "");
    return fs.readFile(path.join(PUBLIC_DIR, normalized));
  }
}
