/**
 * reportFileUploadServices.ts
 * ----------------------------
 * Server-side upload service for `report_files` (BLANK_FORM/SAMPLE_FILLED_FORM
 * PDFs, SAMPLE_DATA Excel/CSV). Unlike lib/fileUploadServices.ts, this does NOT
 * run image conversion — these are finished documents the admin uploads as-is,
 * stored and served exactly as received (system-design.md §3.8).
 *
 * ⚠️  This module uses Node.js `fs` – server side only.
 */

import fs from "fs/promises";
import path from "path";
import { getFileExtension, isFileSizeAllowed } from "./imageConvert";
import { getUploadRoot, getMaxUploadSize } from "./storage-path";

export interface ReportFileUploadResult {
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface ReportFileUploadValidationError {
  field: string;
  message: string;
}

export type ReportFileUploadResponse =
  | { success: true; data: ReportFileUploadResult }
  | { success: false; error: string; validationErrors?: ReportFileUploadValidationError[] };

const UPLOAD_FOLDER = "assest/report-files";
const FALLBACK_MAX_SIZE = 20 * 1024 * 1024; // 20 MB — used only if fileKind isn't in the map below

// Per-file_kind max upload size (Phase 4e, now backed by settings - Phase 5e).
// These are just the fallback used when the setting is unset. PDF form
// templates shouldn't need to be large; SAMPLE_DATA keeps the old flat limit
// since spreadsheets legitimately run bigger.
const MAX_SIZE_BY_KIND: Record<string, number> = {
  BLANK_FORM: 10 * 1024 * 1024, // 10 MB
  SAMPLE_FILLED_FORM: 10 * 1024 * 1024, // 10 MB
  SAMPLE_DATA: 20 * 1024 * 1024, // 20 MB
};

const ALLOWED_EXT_BY_KIND: Record<string, string[]> = {
  BLANK_FORM: ["pdf"],
  SAMPLE_FILLED_FORM: ["pdf"],
  SAMPLE_DATA: ["xlsx", "xls", "csv"],
};

const ALLOWED_MIME_BY_KIND: Record<string, string[]> = {
  BLANK_FORM: ["application/pdf"],
  SAMPLE_FILLED_FORM: ["application/pdf"],
  SAMPLE_DATA: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
  ],
};

function generateUniqueFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const base = originalName
    .split(".")
    .slice(0, -1)
    .join(".")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toLowerCase();
  return `rf_${Date.now()}_${base}.${ext}`;
}

function toRelativePath(absolutePath: string, root: string): string {
  return absolutePath.replace(root, "").replace(/\\/g, "/");
}

export async function uploadReportFile(
  file: File,
  fileKind: string,
  maxFileSizeBytes?: number
): Promise<ReportFileUploadResponse> {
  try {
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided or file is empty." };
    }

    // Kept as an optional param rather than a sync default value (settings
    // live in the DB, which a default expression can't await) - every
    // existing call site still just calls uploadReportFile(file, fileKind)
    // and gets the configured/fallback size either way.
    const effectiveMaxSize = maxFileSizeBytes ?? (await getMaxUploadSize(fileKind, MAX_SIZE_BY_KIND[fileKind] ?? FALLBACK_MAX_SIZE));

    const allowedExt = ALLOWED_EXT_BY_KIND[fileKind];
    const allowedMime = ALLOWED_MIME_BY_KIND[fileKind];
    if (!allowedExt || !allowedMime) {
      return { success: false, error: `Unknown file_kind "${fileKind}".` };
    }

    const validationErrors: ReportFileUploadValidationError[] = [];
    const ext = getFileExtension(file.name);

    if (!allowedExt.includes(ext)) {
      validationErrors.push({
        field: "file",
        message: `Invalid file extension for ${fileKind}. Allowed: ${allowedExt.join(", ")}.`,
      });
    }

    if (!allowedMime.includes(file.type)) {
      validationErrors.push({
        field: "file",
        message: `Invalid MIME type "${file.type}" for ${fileKind}. Allowed: ${allowedMime.join(", ")}.`,
      });
    }

    if (!isFileSizeAllowed(file.size, effectiveMaxSize)) {
      const maxMB = (effectiveMaxSize / 1024 / 1024).toFixed(0);
      validationErrors.push({
        field: "file",
        message: `File too large. Maximum allowed size is ${maxMB} MB.`,
      });
    }

    if (validationErrors.length > 0) {
      return { success: false, error: "Validation failed.", validationErrors };
    }

    const root = await getUploadRoot();
    const uploadDir = path.join(root, UPLOAD_FOLDER);
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = generateUniqueFilename(file.name);
    const absolutePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);

    return {
      success: true,
      data: {
        filePath: toRelativePath(absolutePath, root),
        fileName,
        fileType: file.type,
        fileSize: file.size,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error.";
    console.error("[uploadReportFile] Error:", error);
    return { success: false, error: message };
  }
}

export async function deleteReportFile(relativeFilePath: string): Promise<void> {
  try {
    const root = await getUploadRoot();
    const normalized = relativeFilePath.replace(/^[/\\]+/, "");
    await fs.unlink(path.join(root, normalized));
  } catch (error) {
    console.error("[deleteReportFile] Error:", error);
  }
}
