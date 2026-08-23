/**
 * subReportUploadServices.ts
 * ---------------------------
 * Server-side upload service for `report_sub_reports` design files (Jasper
 * `.jrxml`, Crystal `.rpt`, or a reference `.pdf`). Mirrors
 * lib/reportFileUploadServices.ts's shape (no image conversion — these are
 * design/reference files stored as-is) but browsers report no reliable MIME
 * type for `.jrxml`/`.rpt`, so validation here is extension-based only.
 *
 * ⚠️  This module uses Node.js `fs` via lib/storage – server side only.
 */

import { getFileExtension, isFileSizeAllowed } from "./imageConvert";
import { storage } from "./storage";
import logger from "./logger";

export interface SubReportUploadResult {
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface SubReportUploadValidationError {
  field: string;
  message: string;
}

export type SubReportUploadResponse =
  | { success: true; data: SubReportUploadResult }
  | { success: false; error: string; validationErrors?: SubReportUploadValidationError[] };

const UPLOAD_FOLDER = "assest/report-subreports";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXT = ["jrxml", "rpt", "pdf"];

function generateUniqueFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const base = originalName
    .split(".")
    .slice(0, -1)
    .join(".")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toLowerCase();
  return `sr_${Date.now()}_${base}.${ext}`;
}

export async function uploadSubReportFile(file: File): Promise<SubReportUploadResponse> {
  try {
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided or file is empty." };
    }

    const validationErrors: SubReportUploadValidationError[] = [];
    const ext = getFileExtension(file.name);

    if (!ALLOWED_EXT.includes(ext)) {
      validationErrors.push({
        field: "file",
        message: `Invalid file extension. Allowed: ${ALLOWED_EXT.join(", ")}.`,
      });
    }

    if (!isFileSizeAllowed(file.size, MAX_SIZE)) {
      const maxMB = (MAX_SIZE / 1024 / 1024).toFixed(0);
      validationErrors.push({
        field: "file",
        message: `File too large. Maximum allowed size is ${maxMB} MB.`,
      });
    }

    if (validationErrors.length > 0) {
      return { success: false, error: "Validation failed.", validationErrors };
    }

    const fileName = generateUniqueFilename(file.name);
    const filePath = `/${UPLOAD_FOLDER}/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await storage.write(filePath, buffer);

    return {
      success: true,
      data: {
        filePath,
        fileName,
        fileType: file.type,
        fileSize: file.size,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upload error.";
    logger.error({ error }, "[uploadSubReportFile] Error");
    return { success: false, error: message };
  }
}

export async function deleteSubReportFile(relativeFilePath: string): Promise<void> {
  try {
    await storage.delete(relativeFilePath);
  } catch (error) {
    logger.error({ error }, "[deleteSubReportFile] Error");
  }
}
