import { localStorage } from "./local";
import { s3Storage } from "./s3";

export type { StorageBackend } from "./types";

/**
 * Backend selection point (Phase 7d stub, wired up for real in Phase 12b).
 * Defaults to `local` when STORAGE_BACKEND is unset, preserving today's
 * behavior for anyone who doesn't set the var - this is the only change
 * needed to affect the 5 call sites, since they all already go through this
 * module's `storage` export.
 */
export function currentStorageBackend(): "local" | "s3" {
  return process.env.STORAGE_BACKEND === "s3" ? "s3" : "local";
}

export const storage = currentStorageBackend() === "s3" ? s3Storage : localStorage;
