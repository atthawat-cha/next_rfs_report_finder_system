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

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOAD_FOLDER = "assest/report-files";
const DEFAULT_MAX_SIZE = 20 * 1024 * 1024; // 20 MB

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

function toPublicPath(absolutePath: string): string {
  return absolutePath.replace(PUBLIC_DIR, "").replace(/\\/g, "/");
}

export async function uploadReportFile(
  file: File,
  fileKind: string,
  maxFileSizeBytes = DEFAULT_MAX_SIZE
): Promise<ReportFileUploadResponse> {
  try {
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided or file is empty." };
    }

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

    if (!isFileSizeAllowed(file.size, maxFileSizeBytes)) {
      const maxMB = (maxFileSizeBytes / 1024 / 1024).toFixed(0);
      validationErrors.push({
        field: "file",
        message: `File too large. Maximum allowed size is ${maxMB} MB.`,
      });
    }

    if (validationErrors.length > 0) {
      return { success: false, error: "Validation failed.", validationErrors };
    }

    const uploadDir = path.join(PUBLIC_DIR, UPLOAD_FOLDER);
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = generateUniqueFilename(file.name);
    const absolutePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absolutePath, buffer);

    return {
      success: true,
      data: {
        filePath: toPublicPath(absolutePath),
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

export async function deleteReportFile(publicFilePath: string): Promise<void> {
  try {
    await fs.unlink(path.join(PUBLIC_DIR, publicFilePath));
  } catch (error) {
    console.error("[deleteReportFile] Error:", error);
  }
}
