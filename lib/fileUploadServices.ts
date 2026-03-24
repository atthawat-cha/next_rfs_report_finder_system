/**
 * fileUploadServices.ts
 * ----------------------
 * Server-side file upload service for Next.js App Router.
 * Handles receiving a file, converting it to WebP via imageConvert, and
 * saving it to the designated public folder.
 *
 * Designed to be called from a Next.js Route Handler (app/api/…/route.ts)
 * or a Server Action.
 *
 * ⚠️  This module uses Node.js `fs` – server side only.
 */

import fs from "fs/promises";
import path from "path";
import {
  convertToWebp,
  convertToThumbnail,
  generateUniqueFilename,
  isAllowedImageExtension,
  isAllowedImageMime,
  isFileSizeAllowed,
  ConvertToWebpOptions,
} from "./imageConvert";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Configuration for each upload operation */
export interface UploadConfig {
  /**
   * Destination folder relative to /public.
   * e.g. "assest/reports" → saves to public/assest/reports/
   * Default: "assest/uploads"
   */
  uploadFolder?: string;

  /** Image conversion options (width, height, quality, fit…) */
  convertOptions?: ConvertToWebpOptions;

  /**
   * Maximum allowed file size in bytes.
   * Default: 5 MB
   */
  maxFileSizeBytes?: number;

  /**
   * Whether to also create a thumbnail version.
   * Thumbnail will be stored in <uploadFolder>/thumbnails/
   * Default: false
   */
  generateThumbnail?: boolean;

  /** Filename prefix. Default: "img" */
  filenamePrefix?: string;
}

/** Result returned after a successful upload */
export interface UploadResult {
  /** Path relative to /public, suitable for storing in the database */
  filePath: string;
  /** Absolute path on disk */
  absolutePath: string;
  /** Thumbnail path relative to /public (only if generateThumbnail: true) */
  thumbnailPath?: string;
  /** Absolute thumbnail path on disk */
  thumbnailAbsolutePath?: string;
  /** Final filename (with .webp extension) */
  fileName: string;
  /** File size in bytes */
  size: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/** Upload validation errors */
export interface UploadValidationError {
  field: string;
  message: string;
}

/** Unified response shape for upload operations */
export type UploadServiceResponse =
  | { success: true; data: UploadResult }
  | { success: false; error: string; validationErrors?: UploadValidationError[] };

// ─────────────────────────────────────────────────────────────────────────────
// Constants / Defaults
// ─────────────────────────────────────────────────────────────────────────────

/** Absolute path to the project's /public directory */
const PUBLIC_DIR = path.join(process.cwd(), "public");

const DEFAULT_UPLOAD_FOLDER = "assest/uploads";
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a directory exists, creating it recursively if necessary.
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Resolve the absolute upload directory from a relative folder string.
 */
function resolveUploadDir(folder: string): string {
  return path.join(PUBLIC_DIR, folder);
}

/**
 * Convert an absolute file path to a public-relative path (for DB storage).
 * e.g. /project/public/assest/uploads/img_123.webp → /assest/uploads/img_123.webp
 */
function toPublicPath(absolutePath: string): string {
  return absolutePath.replace(PUBLIC_DIR, "").replace(/\\/g, "/");
}

// ─────────────────────────────────────────────────────────────────────────────
// Main service: uploadImageFile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a single image file:
 *  1. Validate extension, MIME type, and file size.
 *  2. Convert to WebP (with optional resize / quality settings).
 *  3. Save to the target folder inside /public.
 *  4. Optionally generate a thumbnail.
 *  5. Return { filePath } for database storage.
 *
 * @param file   - A Web API `File` object (from formData.get('file'))
 * @param config - Upload configuration
 *
 * @example
 * // In a Next.js Route Handler:
 * const formData = await request.formData();
 * const file = formData.get("image") as File;
 * const result = await uploadImageFile(file, {
 *   uploadFolder: "assest/reports",
 *   convertOptions: { width: 1200, quality: 80 },
 *   generateThumbnail: true,
 * });
 */
export async function uploadImageFile(
  file: File,
  config: UploadConfig = {}
): Promise<UploadServiceResponse> {
  const {
    uploadFolder = DEFAULT_UPLOAD_FOLDER,
    convertOptions = {},
    maxFileSizeBytes = DEFAULT_MAX_SIZE,
    generateThumbnail = false,
    filenamePrefix = "img",
  } = config;

  try {
    // ── 1. Validate ──────────────────────────────────────────────────────────
    const validationErrors: UploadValidationError[] = [];

    if (!file || file.size === 0) {
      return { success: false, error: "No file provided or file is empty." };
    }

    if (!isAllowedImageExtension(file.name)) {
      validationErrors.push({
        field: "file",
        message: `Invalid file extension. Allowed: jpg, jpeg, jpe, png, webp.`,
      });
    }

    if (!isAllowedImageMime(file.type)) {
      validationErrors.push({
        field: "file",
        message: `Invalid MIME type "${file.type}". Allowed: image/jpeg, image/png, image/webp.`,
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
      return {
        success: false,
        error: "Validation failed.",
        validationErrors,
      };
    }

    // ── 2. Convert to WebP ───────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const converted = await convertToWebp(inputBuffer, convertOptions);

    // ── 3. Prepare destination ───────────────────────────────────────────────
    const uploadDir = resolveUploadDir(uploadFolder);
    await ensureDir(uploadDir);

    const fileName = generateUniqueFilename(file.name, filenamePrefix);
    const absolutePath = path.join(uploadDir, fileName);

    await fs.writeFile(absolutePath, converted.buffer);

    const filePath = toPublicPath(absolutePath);

    // ── 4. Optional thumbnail ────────────────────────────────────────────────
    let thumbnailPath: string | undefined;
    let thumbnailAbsolutePath: string | undefined;

    if (generateThumbnail) {
      const thumbBuffer = await convertToThumbnail(inputBuffer);
      const thumbDir = path.join(uploadDir, "thumbnails");
      await ensureDir(thumbDir);

      const thumbFileName = `thumb_${fileName}`;
      thumbnailAbsolutePath = path.join(thumbDir, thumbFileName);
      await fs.writeFile(thumbnailAbsolutePath, thumbBuffer.buffer);
      thumbnailPath = toPublicPath(thumbnailAbsolutePath);
    }

    // ── 5. Return result ─────────────────────────────────────────────────────
    return {
      success: true,
      data: {
        filePath,
        absolutePath,
        thumbnailPath,
        thumbnailAbsolutePath,
        fileName,
        size: converted.size,
        width: converted.width,
        height: converted.height,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown upload error.";
    console.error("[uploadImageFile] Error:", error);
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service: uploadMultipleImages
// ─────────────────────────────────────────────────────────────────────────────

export interface MultipleUploadResult {
  success: UploadResult[];
  failed: { fileName: string; error: string }[];
}

/**
 * Upload multiple image files at once.
 * Processes files in parallel; partial failures are collected separately.
 *
 * @param files  - Array of Web API `File` objects
 * @param config - Shared upload configuration for all files
 *
 * @example
 * const files = formData.getAll("images") as File[];
 * const { success, failed } = await uploadMultipleImages(files, {
 *   uploadFolder: "assest/gallery",
 *   generateThumbnail: true,
 * });
 */
export async function uploadMultipleImages(
  files: File[],
  config: UploadConfig = {}
): Promise<MultipleUploadResult> {
  const results = await Promise.allSettled(
    files.map((file) => uploadImageFile(file, config))
  );

  const succeeded: UploadResult[] = [];
  const failed: { fileName: string; error: string }[] = [];

  results.forEach((result, index) => {
    const fileName = files[index]?.name ?? `file_${index}`;

    if (result.status === "fulfilled") {
      const res = result.value;
      if (res.success) {
        succeeded.push(res.data);
      } else {
        failed.push({ fileName, error: res.error });
      }
    } else {
      failed.push({ fileName, error: String(result.reason) });
    }
  });

  return { success: succeeded, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service: deleteUploadedFile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete a previously uploaded file using its public-relative path.
 * Also removes the corresponding thumbnail if it exists.
 *
 * @param publicFilePath - e.g. "/assest/reports/img_123.webp"
 * @param deleteThumbnail - Whether to also delete the thumbnail (default: true)
 *
 * @example
 * await deleteUploadedFile("/assest/reports/img_123.webp");
 */
export async function deleteUploadedFile(
  publicFilePath: string,
  deleteThumbnail = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const absolutePath = path.join(PUBLIC_DIR, publicFilePath);
    await fs.unlink(absolutePath);

    if (deleteThumbnail) {
      const dir = path.dirname(absolutePath);
      const base = path.basename(absolutePath);
      const thumbPath = path.join(dir, "thumbnails", `thumb_${base}`);
      await fs.unlink(thumbPath).catch(() => {
        // Thumbnail may not exist – ignore the error
      });
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete file.";
    console.error("[deleteUploadedFile] Error:", error);
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service: replaceUploadedFile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replace an existing file with a new upload.
 * Deletes the old file first, then uploads the new one.
 *
 * @param oldPublicPath - Public path of the file to replace
 * @param newFile       - New file to upload
 * @param config        - Upload configuration
 */
export async function replaceUploadedFile(
  oldPublicPath: string | null | undefined,
  newFile: File,
  config: UploadConfig = {}
): Promise<UploadServiceResponse> {
  // Delete the old file first (best-effort, non-blocking on failure)
  if (oldPublicPath) {
    await deleteUploadedFile(oldPublicPath).catch((err) => {
      console.warn("[replaceUploadedFile] Could not delete old file:", err);
    });
  }

  return uploadImageFile(newFile, config);
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export commonly used helpers from imageConvert for convenience
// ─────────────────────────────────────────────────────────────────────────────

export {
  isAllowedImageExtension,
  isAllowedImageMime,
  isFileSizeAllowed,
  getImageMetadata,
} from "./imageConvert";
