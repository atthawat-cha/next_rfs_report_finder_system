import type { StorageBackend } from "./types";

/**
 * Unimplemented on purpose (Phase 7d decision). No S3/MinIO credentials or
 * self-hosted instance exist in any environment this project has access to
 * - writing a "working" implementation now would be untested code
 * pretending to work, the same line Phase 4c drew for AV scanning. This
 * exists to prove the StorageBackend interface shape is real (a second
 * implementation compiles against it), not to be switched to yet.
 */
export const s3Storage: StorageBackend = {
  async write(): Promise<void> {
    throw new Error("S3 storage backend not implemented");
  },
  async read(): Promise<Buffer> {
    throw new Error("S3 storage backend not implemented");
  },
  async delete(): Promise<void> {
    throw new Error("S3 storage backend not implemented");
  },
};
