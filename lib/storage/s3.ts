import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StorageBackend } from "./types";

/**
 * Real S3-compatible backend (Phase 12b). Configured for MinIO by default
 * (forcePathStyle: true - required for MinIO, harmless against real AWS S3)
 * via the S3_ENDPOINT/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/
 * S3_BUCKET env vars documented in SETUP.md. Only constructed/used when
 * lib/storage/index.ts selects it via STORAGE_BACKEND=s3 - importing this
 * module with those env vars unset throws at first call, not at import
 * time, so a `local`-backend deployment is unaffected by their absence.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Strips a leading slash/backslash so a historical file_path (may have been
// written with one, see lib/storage-path.ts's resolveStoredFile()) and a
// clean relative path resolve to the same S3 key either way.
function toKey(relPath: string): string {
  return relPath.replace(/^[/\\]+/, "");
}

let client: S3Client | undefined;

function getClient(): S3Client {
  if (client) return client;
  client = new S3Client({
    endpoint: requireEnv("S3_ENDPOINT"),
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

function getBucket(): string {
  return requireEnv("S3_BUCKET");
}

export const s3Storage: StorageBackend = {
  async write(relPath, buffer) {
    await getClient().send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: toKey(relPath),
      Body: buffer,
    }));
  },

  async read(relPath) {
    const result = await getClient().send(new GetObjectCommand({
      Bucket: getBucket(),
      Key: toKey(relPath),
    }));
    if (!result.Body) throw new Error(`S3 object not found: ${relPath}`);
    return Buffer.from(await result.Body.transformToByteArray());
  },

  async delete(relPath) {
    await getClient().send(new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: toKey(relPath),
    }));
  },
};
