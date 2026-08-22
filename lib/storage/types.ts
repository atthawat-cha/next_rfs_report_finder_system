/**
 * Storage backend interface (Phase 7d). Covers exactly the operations the
 * real call sites need today: writing a new report file, reading one back
 * for download/preview, and deleting one. All paths are the same
 * `report_files.file_path`-style relative path already stored in the DB -
 * traversal-safety is an implementation detail of each backend (the local
 * implementation reuses lib/storage-path.ts's resolveStoredFile()), not
 * part of this interface, since a remote backend has no local filesystem
 * path to resolve against in the first place.
 */
export interface StorageBackend {
  write(relPath: string, buffer: Buffer): Promise<void>;
  read(relPath: string): Promise<Buffer>;
  delete(relPath: string): Promise<void>;
}
