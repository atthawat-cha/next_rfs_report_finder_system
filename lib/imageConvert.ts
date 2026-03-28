/**
 * imageConvert.ts
 * ---------------
 * Utility functions for image conversion and processing.
 * Uses `sharp` (already installed) – runs on the server side only.
 *
 * Features:
 *  - Convert jpe / jpeg / png → WebP
 *  - Optional resize (width, height, fit strategy)
 *  - Configurable WebP quality (0-100, default 80)
 *  - Strip EXIF metadata option
 *  - Returns a Buffer ready to be saved to disk
 */

import sharp, { FitEnum, ResizeOptions } from "sharp";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Allowed input MIME types / extensions */
export type AllowedImageMime =
  | "image/jpeg"
  | "image/jpg"
  | "image/png"
  | "image/webp";

export type AllowedImageExt = "jpg" | "jpeg" | "jpe" | "png" | "webp";

/** Options for the main conversion function */
export interface ConvertToWebpOptions {
  /** Target width in pixels (optional) */
  width?: number;
  /** Target height in pixels (optional) */
  height?: number;
  /** sharp fit strategy – default: "inside" */
  fit?: keyof FitEnum;
  /** WebP quality 1-100 – default: 80 */
  quality?: number;
  /** Strip EXIF / metadata – default: true */
  stripMetadata?: boolean;
  /** Allow enlarging smaller images – default: false */
  withoutEnlargement?: boolean;
}

/** Result of convertToWebp */
export interface ConvertResult {
  buffer: Buffer;
  /** Always "webp" */
  format: "webp";
  /** Size of the output buffer in bytes */
  size: number;
  /** Width in pixels after conversion */
  width: number;
  /** Height in pixels after conversion */
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants / Defaults
// ─────────────────────────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_EXTENSIONS: AllowedImageExt[] = [
  "jpg",
  "jpeg",
  "jpe",
  "png",
  "webp",
];

export const ALLOWED_IMAGE_MIMES: AllowedImageMime[] = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const DEFAULT_QUALITY = 80;
const DEFAULT_FIT: keyof FitEnum = "inside";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: validate extension / MIME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the file extension (lowercase, no dot) from a filename or path.
 * e.g. "photo.JPEG" → "jpeg"
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Validate that a file's extension is one of the allowed image types.
 */
export function isAllowedImageExtension(filename: string): boolean {
  const ext = getFileExtension(filename) as AllowedImageExt;
  return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
}

/**
 * Validate that a MIME type is one of the allowed image MIME types.
 */
export function isAllowedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.includes(mime as AllowedImageMime);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: convertToWebp
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an image buffer (jpe/jpeg/png/webp) to WebP format.
 *
 * @param input   - Raw file buffer (from fs.readFile, formData, etc.)
 * @param options - Resize / quality / metadata options
 * @returns       ConvertResult { buffer, format, size, width, height }
 *
 * @example
 * const result = await convertToWebp(fileBuffer, { width: 800, quality: 75 });
 */
export async function convertToWebp(
  input: Buffer | Uint8Array,
  options: ConvertToWebpOptions = {}
): Promise<ConvertResult> {
  const {
    width,
    height,
    fit = DEFAULT_FIT,
    quality = DEFAULT_QUALITY,
    stripMetadata = true,
    withoutEnlargement = false,
  } = options;

  let pipeline = sharp(input);

  // Strip EXIF / metadata first (recommended before resize)
  if (stripMetadata) {
    pipeline = pipeline.rotate(); // auto-rotate by EXIF, then strip
  }

  // Resize if requested
  if (width || height) {
    const resizeOpts: ResizeOptions = {
      fit,
      withoutEnlargement,
    };
    if (width) resizeOpts.width = width;
    if (height) resizeOpts.height = height;

    pipeline = pipeline.resize(resizeOpts);
  }

  // Convert to WebP
  pipeline = pipeline.webp({ quality });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    format: "webp",
    size: info.size,
    width: info.width,
    height: info.height,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: generate WebP filename
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replace the extension of a filename with ".webp".
 *
 * @param originalName - e.g. "cover-photo.jpeg"
 * @returns            - e.g. "cover-photo.webp"
 */
export function toWebpFilename(originalName: string): string {
  console.log(originalName);
  const name = originalName
    .split(".")
    .slice(0, -1)
    .join(".")
    .replace(/\s+/g, "_"); // replace spaces with underscores
  return `${name}.webp`;
}

/**
 * Generate a unique, timestamped filename.
 *
 * @param originalName - Original filename (any extension)
 * @param prefix       - Optional prefix string
 * @returns            - e.g. "img_1711234567890_cover-photo.webp"
 */
export function generateUniqueFilename(
  originalName: string,
  prefix = "img"
): string {
  const base = originalName
    .split(".")
    .slice(0, -1)
    .join(".")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toLowerCase();
  const timestamp = Date.now();
  return `${prefix}_${timestamp}_${base}.webp`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: get image metadata (width, height, format) without converting
// ─────────────────────────────────────────────────────────────────────────────

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  hasAlpha?: boolean;
}

/**
 * Read basic metadata from an image buffer without converting it.
 * Useful for validation before processing.
 */
export async function getImageMetadata(
  input: Buffer | Uint8Array
): Promise<ImageMetadata> {
  const meta = await sharp(input).metadata();
  return {
    width: meta.width,
    height: meta.height,
    format: meta.format,
    size: meta.size,
    hasAlpha: meta.hasAlpha,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: validate image file size
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if file size (in bytes) is within the allowed limit.
 *
 * @param sizeInBytes   - Actual file size
 * @param limitInBytes  - Maximum allowed size (default: 5 MB)
 */
export function isFileSizeAllowed(
  sizeInBytes: number,
  limitInBytes = 5 * 1024 * 1024
): boolean {
  return sizeInBytes <= limitInBytes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset: thumbnail conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an image to a small thumbnail WebP.
 * Default: 300 × 300 px, quality 70, cover fit.
 */
export async function convertToThumbnail(
  input: Buffer | Uint8Array,
  options: Partial<ConvertToWebpOptions> = {}
): Promise<ConvertResult> {
  return convertToWebp(input, {
    width: 300,
    height: 300,
    fit: "cover",
    quality: 70,
    ...options,
  });
}
