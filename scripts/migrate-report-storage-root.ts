import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { faker } from "@faker-js/faker";
import prisma from "@/lib/prisma";

/**
 * One-off, idempotent migration for Phase 16 (system-audit-2026-08-30.md item 2):
 * moves report_files/report_sub_reports uploads out from under public/ (where
 * Next's static handler served them to anyone with a session cookie, bypassing
 * lib/report-acl.ts entirely) into a private root, then points UPLOAD_BASE_PATH
 * at it. Must run BEFORE relying on the new DEFAULT_UPLOAD_BASE_PATH fallback in
 * lib/storage-path.ts against real data - it hardcodes the OLD root itself
 * rather than calling getUploadRoot(), which would already resolve to the new
 * default post-fix.
 */

const OLD_ROOT = path.join(process.cwd(), "public");
const NEW_ROOT = path.join(process.cwd(), "storage", "uploads");
const SUBDIRS = ["assest/report-files", "assest/report-subreports"];

async function moveIfExists(rel: string): Promise<void> {
  const from = path.join(OLD_ROOT, rel);
  const to = path.join(NEW_ROOT, rel);

  try {
    await fs.access(from);
  } catch {
    console.log(`skip (not present): ${rel}`);
    return;
  }

  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
  console.log(`moved: ${rel} -> ${to}`);
}

async function main(): Promise<void> {
  for (const rel of SUBDIRS) {
    await moveIfExists(rel);
  }

  await prisma.settings.upsert({
    where: { key: "UPLOAD_BASE_PATH" },
    create: {
      id: faker.string.uuid(),
      key: "UPLOAD_BASE_PATH",
      value: "storage/uploads",
      type: "STRING",
      category: "STORAGE",
      is_public: false,
      updated_at: new Date(),
    },
    update: { value: "storage/uploads", updated_at: new Date() },
  });
  console.log("UPLOAD_BASE_PATH set to storage/uploads");
  console.log("Restart the dev server so lib/system-settings.ts's 30s cache picks this up immediately.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
