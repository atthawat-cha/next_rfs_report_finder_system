import { localStorage } from "./local";

export type { StorageBackend } from "./types";

/**
 * Backend selection point (Phase 7d). Unconditionally local for now - see
 * s3.ts's header comment for why. Swapping this to read a config value
 * (e.g. a STORAGE_BACKEND setting) is the seam for when a real second
 * backend exists to test against.
 */
export const storage = localStorage;
