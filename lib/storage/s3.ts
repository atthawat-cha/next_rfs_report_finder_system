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

let client: S3Client | undefined;

function getClient(): S3Client {
  if (client) return client;
  const endpoint = process.env.S3_ENDPOINT;
  if (!endpoint) throw new Error("S3_ENDPOINT is not set");
  client = new S3Client({
    endpoint,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? (() => { throw new Error("S3_ACCESS_KEY_ID is not set"); })(),
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? (() => { throw new Error("S3_SECRET_ACCESS_KEY is not set"); })(),
    },
  });
  return client;
}

function getBucket(): string {
  return process.env.S3_BUCKET ?? (() => { throw new Error("S3_BUCKET is not set"); })();
}

export const s3Storage: StorageBackend = {
  async write(relPath, buffer) {
    await getClient().send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: relPath.replace(/^[/\\]+/, ""),
      Body: buffer,
    }));
  },

  async read(relPath) {
    const result = await getClient().send(new GetObjectCommand({
      Bucket: getBucket(),
      Key: relPath.replace(/^[/\\]+/, ""),
    }));
    if (!result.Body) throw new Error(`S3 object not found: ${relPath}`);
    return Buffer.from(await result.Body.transformToByteArray());
  },

  async delete(relPath) {
    await getClient().send(new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: relPath.replace(/^[/\\]+/, ""),
    }));
  },
};
