import fs from "fs/promises";
import path from "path";
import { resolveStoredFile } from "@/lib/storage-path";
import type { StorageBackend } from "./types";

/**
 * The only backend actually exercised anywhere - wraps
 * lib/storage-path.ts's existing traversal-safe resolveStoredFile() (which
 * already accounts for UPLOAD_BASE_PATH), so this is a behavior-preserving
 * wrapper, not a rewrite of the path-safety logic.
 */
export const localStorage: StorageBackend = {
  async write(relPath, buffer) {
    const absolutePath = await resolveStoredFile(relPath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);
  },

  async read(relPath) {
    const absolutePath = await resolveStoredFile(relPath);
    return fs.readFile(absolutePath);
  },

  async delete(relPath) {
    const absolutePath = await resolveStoredFile(relPath);
    await fs.unlink(absolutePath);
  },
};
