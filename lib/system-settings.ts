import prisma from "@/lib/prisma";

/**
 * Small cached reader over the `settings` table for the handful of keys
 * Phase 5e introduced (UPLOAD_BASE_PATH, MAX_UPLOAD_SIZE_*, ORG_NAME,
 * ADMIN_EMAIL, DEFAULT_PAGE_SIZE, DEFAULT_SHARE_EXPIRY_DAYS) plus the two
 * from 4e (STORAGE_LIMIT_BYTES, MAINTENANCE_MODE). A DB read on every
 * upload/download/pagination call is not acceptable, but settings change
 * rarely, so a short TTL cache is enough — invalidated explicitly right
 * after PUT /api/settings/system writes so a change takes effect on the
 * next request instead of waiting out the TTL.
 */

const CACHE_TTL_MS = 30_000;

const KNOWN_KEYS = [
  "STORAGE_LIMIT_BYTES",
  "MAINTENANCE_MODE",
  "UPLOAD_BASE_PATH",
  "MAX_UPLOAD_SIZE_BLANK_FORM",
  "MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM",
  "MAX_UPLOAD_SIZE_SAMPLE_DATA",
  "ORG_NAME",
  "ADMIN_EMAIL",
  "DEFAULT_PAGE_SIZE",
  "DEFAULT_SHARE_EXPIRY_DAYS",
] as const;

let cache: { map: Map<string, string>; expiresAt: number } | null = null;

async function getSettingsMap(): Promise<Map<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;
  const rows = await prisma.settings.findMany({ where: { key: { in: KNOWN_KEYS as unknown as string[] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  cache = { map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

/** Call after writing any setting so the next read reflects it immediately. */
export function invalidateSettingsCache(): void {
  cache = null;
}

export async function getSettingString(key: string, fallback: string): Promise<string> {
  const map = await getSettingsMap();
  const value = map.get(key);
  return value === undefined || value === "" ? fallback : value;
}

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const map = await getSettingsMap();
  const raw = map.get(key);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
