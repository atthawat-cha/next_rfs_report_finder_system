# Phase 16 — Security Hardening Round 2 (P0 from 2026-08-30 audit)

## Context

`document/system-audit-2026-08-30.md` audited the whole system against `system-checklist.md` and found
four items serious enough to fix immediately, none of them requiring a broad rewrite:

1. `app/api/users/user/[id]/route.ts` GET has **no auth check at all** — any caller who knows/guesses a
   user id gets back that user's PII (username, email, first/last name, status, department_id).
2. Uploaded report files (`report_files`/`report_sub_reports` rows) are served twice: once correctly,
   through ACL-checked API routes (`storage.read()`), and once by accident, because they physically live
   under `public/` where Next's static file server hands them out to anyone with a valid session cookie —
   never checking per-report ACL.
3. No CSRF defense-in-depth exists beyond the `auth-token` cookie's `SameSite=Lax` attribute.
4. The Redis-backed rate limiter (`lib/rate-limit.ts`) only protects login/2FA/2 dashboard routes — no
   general write-endpoint has any abuse protection.

## Audit — measured, not assumed

**Item 1** is exactly as bad as it looks: `app/api/users/user/[id]/route.ts:5-45` is a plain `prisma.users.findUnique`
with zero imports from `lib/auth.ts`. Its sibling list endpoint, `app/api/users/user/route.ts:15,22`, gates
the same data with `requireRole(req, routeAcceptted('admin'))` — the `[id]` route should match that tier
exactly, not `'user'` tier, since listing/viewing arbitrary users by id is the same admin-only concern as
listing them all.

**Item 2** is narrower than it first looked. `lib/storage-path.ts`'s `getUploadRoot()` already reads a
configurable `UPLOAD_BASE_PATH` setting (Phase 5e, `/settings/storage` UI), and every real read/write path
already goes through it: `lib/storage/local.ts` (`resolveStoredFile()`), `lib/reportFileUploadServices.ts`
and `lib/subReportUploadServices.ts` (write via `storage.write()`), and every download/preview route
(`app/api/reports/[id]/files/[fileId]/download/route.ts:79`, its `preview` sibling) read via `storage.read()`
— never a redirect to a public URL. **The bug is purely that the fallback/default value of `UPLOAD_BASE_PATH`
is `"public"`** (`lib/storage-path.ts:22`, `app/api/settings/system/route.ts:25`), so out of the box, ACL-worthy
files sit in a statically-servable directory. `report_files` writes to `assest/report-files`
(`lib/reportFileUploadServices.ts:33`), `report_sub_reports` writes to `assest/report-subreports`
(`lib/subReportUploadServices.ts:33`) — both relative to whatever root is configured. A separate,
intentionally-public image pipeline (`lib/fileUploadServices.ts`, hardcoded to `PUBLIC_DIR = path.join(process.cwd(), "public")`,
used for report cover-image thumbnails shown via `<Image src={report.file_path}>` in `reportCards.tsx:39`)
is architecturally distinct and **out of scope** — it was never meant to be ACL-gated, and moving it would
break thumbnail rendering for no security benefit.

Confirmed via `git status` at audit time: `public/assest/report-files/rf_1788024356583_1.png`,
`public/assest/report-files/rf_1788024645035_..._smis_smart_iv_monitoring2.pdf`, and
`public/assest/report-subreports/` are real files from prior testing, sitting exactly where this bug says
they would — useful as a live test case for the migration script below. They're also untracked in git
despite `.gitignore:17-19`'s comment claiming uploaded-file directories are ignored "to mirror the rest of
public/'s uploaded-file directories" — no such entry actually exists for `assest/`. Moot for `report-files`/
`report-subreports` once they move out of `public/`; not otherwise addressed by this phase.

**Item 3**: no CSRF token, double-submit cookie, or header check exists anywhere (confirmed via repo-wide
grep). `lib/auth.ts:87-95`'s `setAuthCookie` sets `sameSite: 'lax'`, which blocks cross-site simple form
`POST`s in modern browsers but is not defense-in-depth on its own.

**Item 4**: `lib/rate-limit.ts:17-18,22` hardcodes `MAX_ATTEMPTS = 5`, `WINDOW_MS = 15min`, and a
`ratelimit:login:${identifier}` key — tuned for login brute-force, not general API abuse, and wired into
only 4 routes.

## Resolved decisions

- **Item 1**: use `routeAcceptted('admin')`, matching the list endpoint exactly — not a new tier.
- **Item 2**: fix at the `UPLOAD_BASE_PATH` layer (change the default, reject public-relative values,
  migrate the files that exist today), **not** by touching `proxy.ts`'s matcher or adding per-route checks —
  the ACL enforcement machinery is already correct, it's a footgun default. New default root:
  `storage/uploads/` (sibling to `public/`, outside anything Next serves statically).
- **Item 3**: implement as an `Origin`-header check inside `lib/auth.ts`'s `requireAuth()` — not a
  client-supplied custom header. A repo-wide check found **28 files** making raw `fetch()` calls with no
  shared wrapper (no axios instance, no `lib/apiClient.ts`); requiring a new header on every mutating call
  would mean touching all 28 with real risk of silently breaking a write path if one is missed. An
  `Origin`/`Host` comparison is enforced entirely server-side, requires zero client changes, and is the
  standard OWASP-recommended defense-in-depth for cookie-based CSRF. Requests carrying a `Bearer` token
  (not a cookie) are exempt — there's no ambient credential for a forged cross-site request to ride on.
- **Item 4**: extend `lib/rate-limit.ts` with a second, more permissive bucket rather than importing it into
  `lib/auth.ts` — a comment at `lib/rate-limit.ts:7-15` explicitly documents keeping it out of `lib/auth.ts`
  as "a deliberate choice to keep `lib/auth.ts`'s dependency surface small," and this phase has no reason to
  reverse that. Apply the new bucket to a named list of the highest-value write endpoints (report create/
  update, favorites toggle, ticket create, sub-report/file upload, permissions/shares bulk update) rather
  than a blanket sweep of all 61 routes — universal coverage (likely via `proxy.ts`, which currently excludes
  `/api/*` entirely) is a larger, separate architectural change and stays out of this phase.

---

## Sub-phase 16a — Auth guard on `GET /api/users/user/[id]`

### 1. `app/api/users/user/[id]/route.ts`

Add the same guard its sibling list route uses, before the `prisma.users.findUnique` call:

```ts
import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { requireRole, routeAcceptted } from '@/lib/auth';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const authResult = await requireRole(req, routeAcceptted('admin'));
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = await prisma.users.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        department_id: true,
        created_at: true,
        updated_at: true,
      },
    });
    // ... unchanged from here
```

### Verification (16a)
- `curl -i http://localhost:3501/api/users/user/<any-real-id>` with no cookie → `401`.
- Log in as a non-admin `user`/`guest` role, call the same endpoint → `403`.
- Log in as `admin`/`super_admin`, call it with a real id → `200` with the same JSON shape as before.
- `npx tsc --noEmit` still 0 errors.

---

## Sub-phase 16b — Move report/sub-report file storage out of `public/`

### 1. `lib/storage-path.ts` — reject public-relative paths, change the default

```ts
import fs from "fs/promises";
import path from "path";
import { faker } from "@faker-js/faker";
import { getSettingNumber, getSettingString } from "@/lib/system-settings";

export const DEFAULT_UPLOAD_BASE_PATH = "storage/uploads";

// ... MAX_SIZE_KEY_BY_KIND unchanged ...

export async function getUploadRoot(): Promise<string> {
  const configured = await getSettingString("UPLOAD_BASE_PATH", DEFAULT_UPLOAD_BASE_PATH);
  return path.isAbsolute(configured) ? path.normalize(configured) : path.join(process.cwd(), configured);
}
```

In `validateUploadBasePath`, after computing `resolved` (right after the existing `stat.isDirectory()` check,
before the write-probe), reject anything inside `public/` — this is what makes the footgun impossible to
reintroduce through the settings UI later:

```ts
  const publicDir = path.join(process.cwd(), "public");
  const publicDirWithSep = publicDir.endsWith(path.sep) ? publicDir : publicDir + path.sep;
  if (resolved === publicDir || resolved.startsWith(publicDirWithSep)) {
    return {
      ok: false,
      error: `ห้ามตั้งค่าเป็นไดเรกทอรีภายใต้ "public/" — ไฟล์จะถูกเข้าถึงได้โดยตรงโดยไม่ผ่านการตรวจสิทธิ์ (ACL bypass)`,
    };
  }
```

### 2. `app/api/settings/system/route.ts` — reuse the shared default, update the UI hint

Replace the local `const DEFAULT_UPLOAD_BASE_PATH = 'public';` with an import:

```ts
import { validateUploadBasePath, DEFAULT_UPLOAD_BASE_PATH } from '@/lib/storage-path';
```

(delete the old local `const DEFAULT_UPLOAD_BASE_PATH = 'public';` line so there is exactly one definition).

### 3. `app/[locale]/(auth)/settings/storage/page.tsx`

Change the input's `placeholder="public"` to `placeholder="storage/uploads"` so the UI hint matches the new
safe default instead of suggesting the insecure one.

### 4. `prisma/seed-ci.ts` — stop hardcoding `public/`

Its comment at line 127-130 already documents the assumption it's relying on today (the old fallback). Fix it
to resolve the same way the real code does, so CI keeps passing regardless of what the default is:

```ts
import { getUploadRoot } from "@/lib/storage-path";
// ...
const absoluteFilePath = path.join(await getUploadRoot(), E2E_FILE_RELATIVE_PATH);
```

(remove the now-inaccurate comment about the default living under `public/`).

### 5. New file: `scripts/migrate-report-storage-root.ts`

One-off, idempotent migration for environments (like this dev DB) that already have files under the old
`public/`-based root. Moves the two known upload subtrees and points `UPLOAD_BASE_PATH` at the new root.
Must run **before** sub-phase 16b's other changes take effect against real data (i.e. run it against the
*old* default), so it computes the old root itself rather than trusting `getUploadRoot()`:

```ts
import fs from "fs/promises";
import path from "path";
import { faker } from "@faker-js/faker";
import prisma from "@/lib/prisma";

const OLD_ROOT = path.join(process.cwd(), "public");
const NEW_ROOT = path.join(process.cwd(), "storage", "uploads");
const SUBDIRS = ["assest/report-files", "assest/report-subreports"];

async function moveIfExists(rel: string) {
  const from = path.join(OLD_ROOT, rel);
  const to = path.join(NEW_ROOT, rel);
  try {
    await fs.access(from);
  } catch {
    console.log(`skip (not present): ${rel}`);
    return;
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
  console.log(`moved: ${rel}`);
}

async function main() {
  for (const rel of SUBDIRS) {
    await moveIfExists(rel);
  }

  await prisma.settings.upsert({
    where: { key: "UPLOAD_BASE_PATH" },
    create: {
      id: faker.string.uuid(),
      key: "UPLOAD_BASE_PATH",
      value: "storage/uploads",
      type: "STRING",
      category: "STORAGE",
      is_public: false,
      updated_at: new Date(),
    },
    update: { value: "storage/uploads", updated_at: new Date() },
  });
  console.log("UPLOAD_BASE_PATH set to storage/uploads");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run once with `npx tsx scripts/migrate-report-storage-root.ts`, then restart the dev server (the settings
cache has a 30s TTL — a restart is simpler than timing it).

### 6. `.gitignore`

Add an entry for the new root so any locally-migrated or newly-uploaded files never get committed:

```
# report/sub-report uploads live outside public/ as of Phase 16 (system-audit-2026-08-30.md item 2)
/storage/uploads/
```

### 7. Discovered during implementation: `reports.file_path` also reads/writes raw `public/` paths

Live-testing the migration (running it against this dev DB's real data, not just reasoning about the
code) surfaced something the audit missed: `reports.file_path` — a legacy, pre-`report_files` single-file
field still populated by `report/manage`'s create flow, used both as the report-card thumbnail `<Image src>`
(`reportCards.tsx:39`, `favReportCard.tsx:37`) **and** read directly from `PUBLIC_DIR` by
`app/api/reports/[id]/download/route.ts` — for many existing reports points into the exact
`assest/report-files/` directory this sub-phase migrates. Moving those files broke both: the thumbnail
(a raw static `<Image src="/assest/report-files/...">`) and the legacy download route (hardcoded
`fs.readFile(path.join(PUBLIC_DIR, report.file_path))`, no `storage.read()`). The same field also has rows
that never moved (`/uploads/rpt1.pdf`, `/assest/uploads/*.webp` — genuinely still public, untouched by this
migration) and one row (`/uploads/rpt2.pdf`) whose target never existed on disk at all — a pre-existing,
unrelated data gap, not a regression.

Additionally, `app/shares/[token]/page.tsx` linked the same legacy `reports.file_path` fallback (`f.id ===
null` case) as a **raw, unauthenticated static href** on the public share page — its own comment explained
this "always lives under public/" (true when written, false as of this migration).

Fixed all three, added `lib/legacy-report-file.ts` exporting `readReportFileWithLegacyFallback(relPath)` —
tries `storage.read()` first (covers migrated content and correctly defers to whatever backend is
configured), falls back to a direct `public/` read (covers the never-migrated rows) — used by all three call
sites so the two copies can't drift:

- `app/api/reports/[id]/download/route.ts` — replaced its hardcoded `PUBLIC_DIR`/`fs.readFile` with the
  shared helper (already ACL-checked via `resolveReportAcl`, `can_export`; this was the correctness fix, not
  a new security boundary).
- New `app/api/reports/[id]/thumbnail/route.ts` — ACL-checked (`can_view`, lower bar than `can_export` since
  showing a card thumbnail isn't an export), no download-count/activity-log side effects (a view, not a
  download, matching `.../files/[fileId]/preview`'s stance). `reportCards.tsx` and `favReportCard.tsx` now
  point their `<Image src>` at `/api/reports/${report.id}/thumbnail` instead of the raw path.
- New `app/api/shares/[token]/download/route.ts` — mirrors `.../files/[fileId]/download`'s token/expiry/
  `can_download` checks, for the `reports.file_path` fallback case specifically. `app/shares/[token]/page.tsx`'s
  href now points here instead of the raw `f.file_path`.

### Verification (16b) — actually run, 2026-08-30

- Before running the migration script: confirmed via `ls` that `public/assest/report-files/` (6 files) and
  `public/assest/report-subreports/` (1 file) held real content — the same files `git status` showed
  untracked at audit time.
- Ran `npx tsx scripts/migrate-report-storage-root.ts` — logged both dirs moved; confirmed via `ls`
  afterward that `public/assest/report-files/` and `public/assest/report-subreports/` no longer exist, and
  the same 7 files now sit under `storage/uploads/assest/report-files/` and `.../report-subreports/`.
- **The actual fix, proven**: `curl http://localhost:3501/assest/report-files/rf_1788024356583_1.png` now
  gets Next's static 404 (filesystem-level: the bytes are no longer anywhere under `public/`, so this holds
  regardless of session state) — before this phase it would have returned the file's bytes to anyone with a
  valid session, regardless of that report's ACL.
- Logged in as the seeded `e2e-admin` and confirmed with real bytes, live against the running dev server
  (no restart needed — Next recompiles route handlers per request, and `lib/system-settings.ts`'s 30s cache
  had already turned over by the time of these calls):
  - `GET /api/reports/{FIN-0025 report id}/download` → `200`, 6.1MB, correct PDF bytes (file physically
    migrated, resolves via `storage.read()`).
  - `GET /api/reports/{"test" report id}/thumbnail` → `200`, `image/png` (thumbnail path also migrated,
    resolves via the new endpoint + shared fallback helper).
  - `GET /api/reports/{Anes-001 report id}/thumbnail` → `200`, `image/webp` (this report's `file_path` was
    **never** migrated, still physically under `public/assest/uploads/` — proves the fallback half of
    `readReportFileWithLegacyFallback` works, not just the migrated-path half).
- `npx tsc --noEmit` = 0 errors, `npm test` = 37/37 passed (1 skipped, same as baseline) both before and
  after the item-7 fixes.
- Not live-exercised: `GET /api/shares/[token]/download` — no `report_shares` rows exist in this dev DB to
  test against. Verified instead by type-checking cleanly and mirroring the already-proven
  `.../files/[fileId]/download` route's token/expiry/`can_download` checks structurally, plus reusing the
  same `readReportFileWithLegacyFallback` helper already live-verified above.
- In `/settings/storage`, attempt to set `UPLOAD_BASE_PATH` to `public` or `public/foo` → rejected with the
  new Thai error message; setting it to another real, writable directory outside `public/` still succeeds.
- `npx tsc --noEmit` = 0 errors, `npm test` unaffected, `npm run test:e2e` still passes (seed-ci.ts change).

---

## Sub-phase 16c — CSRF defense-in-depth (Origin check)

### `lib/auth.ts`

```ts
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // no Origin header to check - don't block on absence, only on mismatch
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false; // malformed Origin header - treat as untrusted
  }
}

export async function requireAuth(req: NextRequest): Promise<JWTPayload | NextResponse> {
  const cookieToken = getTokenFromCookie(req);
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = cookieToken ?? bearerToken;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // CSRF defense-in-depth: a cookie-authenticated request that changes state must
  // originate from this app's own origin. SameSite=Lax already blocks cross-site
  // simple form POSTs in modern browsers; this closes the gap for fetch/XHR-based
  // cross-site requests and any browser where SameSite is ineffective. Bearer-token
  // callers are exempt - forging one requires stealing the token itself, not just
  // riding an ambient cookie.
  if (cookieToken && !bearerToken && !SAFE_METHODS.has(req.method) && !isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return payload;
}
```

No other file changes — every route already funnels through `requireAuth`/`requireRole`.

### Verification (16c)
- Normal app usage (same-origin fetch calls from the actual UI) — every existing write flow (create/edit
  report, permissions, favorites, tickets, role/user management) still works with no 403s introduced.
- `curl -i -X POST http://localhost:3501/api/reports/report/manage -H "Origin: https://evil.example" -H "Cookie: auth-token=<valid token>" -H "Content-Type: application/json" -d '{}'` → `403` (was previously whatever the handler did with a malformed body — now rejected before reaching it).
- Same `curl` with no `Origin` header at all → falls through to the existing 401/validation logic unchanged
  (proves the check only blocks a *mismatched* Origin, not a missing one).
- A `GET` request with a cross-site `Origin` still succeeds (proves safe methods are exempt).
- `npx tsc --noEmit` = 0 errors, `npm test` passes, `npm run test:e2e` passes (Playwright specs run same-origin
  through `webServer`, so Origin always matches).

---

## Sub-phase 16d — Rate limit the highest-value write endpoints

### 1. `lib/rate-limit.ts` — add a second, named bucket

```ts
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const GENERAL_MAX_ATTEMPTS = 60;
const GENERAL_WINDOW_MS = 60 * 1000; // 1 minute

async function checkBucket(
  bucket: string,
  identifier: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (!identifier) return { allowed: false };
  const key = `ratelimit:${bucket}:${identifier}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.pexpire(key, windowMs);
    if (count > max) {
      const ttl = await redis.pttl(key);
      return { allowed: false, retryAfter: Math.max(0, Math.ceil(ttl / 1000)) };
    }
    return { allowed: true };
  } catch (err) {
    logger.error({ err }, `[rateLimit] redis error on bucket "${bucket}", failing open`);
    return { allowed: true }; // fail-open: rate limiting is defense-in-depth, not the primary auth boundary
  }
}

export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  return checkBucket('login', identifier, MAX_ATTEMPTS, WINDOW_MS);
}

/** Looser, per-user bucket for general write endpoints (report create/update, favorites, tickets, uploads). */
export async function checkGeneralRateLimit(identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  return checkBucket('write', identifier, GENERAL_MAX_ATTEMPTS, GENERAL_WINDOW_MS);
}

export async function resetRateLimit(identifier: string): Promise<void> {
  try {
    await redis.del(`ratelimit:login:${identifier}`);
  } catch (err) {
    logger.error({ err }, '[rateLimit] redis error on reset');
  }
}

export async function rateLimit(identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  return checkRateLimit(identifier);
}
```

### 2. Apply `checkGeneralRateLimit(authResult.user.id)` to each of these, right after the existing
`requireRole`/`requireAuth` guard, returning `429` on rejection (same shape the login route already uses):

- `app/api/reports/report/manage/route.ts` (POST/PUT — report create/update)
- `app/api/reports/favorites/route.ts` (POST/DELETE — favorite toggle)
- `app/api/tickets/route.ts` (POST — ticket create)
- `app/api/reports/[id]/sub-reports/route.ts` (POST/PUT — sub-report upload)
- `app/api/reports/[id]/permissions/route.ts` and `app/api/reports/[id]/shares/route.ts` (POST/PUT — bulk ACL writes)

Each gets the same three lines after its existing auth check:

```ts
const rate = await checkGeneralRateLimit(authResult.user.id);
if (!rate.allowed) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

(import `checkGeneralRateLimit` from `@/lib/rate-limit` in each file.)

### Verification (16d)
- With Redis running: script 65 rapid POSTs to `report/manage` as the same user within a minute → the 61st
  onward gets `429`; a different user's requests in the same window are unaffected.
- Stop the Redis container (`docker compose stop redis`) and repeat → requests still succeed (fail-open),
  confirming the existing dashboard/login rate limits' fail-open behavior is preserved for the new bucket too.
- `npx tsc --noEmit` = 0 errors, `npm test` passes, `npm run test:e2e` passes (specs stay well under 60
  writes/minute).

---

## Out of scope (deliberately, per `system-audit-2026-08-30.md`)

- Universal rate limiting across all 61 routes (would mean either a `proxy.ts` matcher change covering
  `/api/*` — a bigger, separate architectural change — or touching every file by hand).
- Full CSRF token/double-submit-cookie implementation (Origin-check is the chosen defense-in-depth level
  for this phase; revisit only if a real gap in Origin-check coverage surfaces).
- Everything in P1-P4 of `system-audit-2026-08-30.md` (transactions, validation coverage, response-envelope
  consistency, service/repository layers, CD, DB backup, health check, etc.) — separate phase(s).
