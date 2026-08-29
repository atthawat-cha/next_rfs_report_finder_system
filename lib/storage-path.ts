import fs from "fs/promises";
import path from "path";
import { faker } from "@faker-js/faker";
import { getSettingNumber, getSettingString } from "@/lib/system-settings";

/**
 * Single resolver for where report files actually live on disk, configurable
 * via the UPLOAD_BASE_PATH setting (Phase 5e) instead of the hardcoded
 * `public/` every call site used to assume independently
 * (lib/reportFileUploadServices.ts writing, the per-file_kind download and
 * preview routes reading). A configurable root is only safe if every one of
 * those goes through this module.
 */

const MAX_SIZE_KEY_BY_KIND: Record<string, string> = {
  BLANK_FORM: "MAX_UPLOAD_SIZE_BLANK_FORM",
  SAMPLE_FILLED_FORM: "MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM",
  SAMPLE_DATA: "MAX_UPLOAD_SIZE_SAMPLE_DATA",
};

export const DEFAULT_UPLOAD_BASE_PATH = "storage/uploads";

export async function getUploadRoot(): Promise<string> {
  const configured = await getSettingString("UPLOAD_BASE_PATH", DEFAULT_UPLOAD_BASE_PATH);
  return path.isAbsolute(configured) ? path.normalize(configured) : path.join(process.cwd(), configured);
}

export async function getMaxUploadSize(fileKind: string, fallback: number): Promise<number> {
  const key = MAX_SIZE_KEY_BY_KIND[fileKind];
  if (!key) return fallback;
  const value = await getSettingNumber(key, fallback);
  return value > 0 ? value : fallback;
}

/**
 * Resolves a stored relative file_path against the current upload root and
 * asserts the result is still inside it — rejects `..` traversal, an
 * absolute-looking file_path (path.resolve would otherwise let it override
 * the root entirely), and symlink-style escapes.
 *
 * Historical rows (written back when uploads always lived under `public/`)
 * store file_path with a leading slash (see the old toPublicPath() in
 * lib/reportFileUploadServices.ts) - stripped here so both old and new rows
 * resolve the same way regardless of which root is currently configured.
 */
export async function resolveStoredFile(relPath: string): Promise<string> {
  const root = await getUploadRoot();
  const normalized = relPath.replace(/^[/\\]+/, "");
  const resolved = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error("Resolved path escapes the configured upload root");
  }
  return resolved;
}

export interface UploadBasePathValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Validates a candidate UPLOAD_BASE_PATH value at write time (PUT
 * /api/settings/system) rather than at first use — a bad value here would
 * otherwise break every upload and every download for every user until
 * someone notices.
 */
export async function validateUploadBasePath(value: string): Promise<UploadBasePathValidationResult> {
  if (value.split(/[/\\]/).includes("..")) {
    return { ok: false, error: "ห้ามใช้ '..' ในพาธ" };
  }

  const resolved = path.isAbsolute(value) ? path.normalize(value) : path.join(process.cwd(), value);

  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    return { ok: false, error: `ไม่พบไดเรกทอรี "${resolved}" — ต้องมีอยู่จริงก่อนตั้งค่า` };
  }
  if (!stat.isDirectory()) {
    return { ok: false, error: `"${resolved}" ไม่ใช่ไดเรกทอรี` };
  }

  const publicDir = path.join(process.cwd(), "public");
  const publicDirWithSep = publicDir.endsWith(path.sep) ? publicDir : publicDir + path.sep;
  if (resolved === publicDir || resolved.startsWith(publicDirWithSep)) {
    return {
      ok: false,
      error: `ห้ามตั้งค่าเป็นไดเรกทอรีภายใต้ "public/" — ไฟล์จะถูกเข้าถึงได้โดยตรงโดยไม่ผ่านการตรวจสิทธิ์ (ACL bypass)`,
    };
  }

  const probeFile = path.join(resolved, `.rfs-write-probe-${faker.string.alphanumeric(8)}`);
  try {
    await fs.writeFile(probeFile, "probe");
    await fs.unlink(probeFile);
  } catch {
    return { ok: false, error: `ไม่มีสิทธิ์เขียนไฟล์ในไดเรกทอรี "${resolved}"` };
  }

  return { ok: true };
}
