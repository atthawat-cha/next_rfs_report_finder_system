# Phase 4 — Hardening & Enterprise Features

## Context

Phase 0-3e (`document/phase0-plan.md`–`phase3-plan.md`) shipped and verified end-to-end against the live DB (`document/00-progress.md`, 39/39 verification checks passed 2026-08-17). Phase 4 is everything `feature-list.md` still marks ❌/⚠️ that isn't a small in-place gap on an already-shipped feature — see that file's Phase-4-tagged rows for the authoritative list (refreshed 2026-08-17, `abd3629`).

Unlike Phase 2/3, Phase 4's items don't share one data model or one user flow — they're unrelated hardening/ops/DX concerns that happen to all be "not urgent enough to block Phase 1-3." Audit before planning:

- **No test runner exists in the repo at all** (`package.json` has no `test` script, no `vitest`/`jest`/`playwright` dependency) — `npx tsc --noEmit` and manual curl/psql verification are the only checks that currently exist.
- **No security response headers at all** — `next.config.js` has no `headers()` block; `curl -I` against any route returns only Next's defaults (`x-powered-by: Next.js` is the only security-adjacent header present, and it *leaks* the framework rather than hardening anything).
- **No i18n library** — `next-intl`/similar not installed; Thai/English text is hardcoded inline throughout, mixed per-component.
- **No error tracking / structured logging** — `console.log`/`console.error` calls scattered through route handlers (see `logActivity`'s own `console.error` on write failure, `getCurrentUser`'s swallowed `catch`), nothing aggregated anywhere.
- **No ClamAV or any AV scanning dependency** — `lib/fileUploadServices.ts` / `lib/reportFileUploadServices.ts` validate MIME type and extension only.
- Several small gaps surfaced by the 2026-08-17 `feature-list.md` refresh that don't fit Phase 1-3's scope but aren't "new enterprise feature" either: no per-`file_kind` download endpoint for non-primary files (`SAMPLE_FILLED_FORM` on a `PRINT_FORM` report has no user-facing download route), no inline PDF/Excel preview, no client-side print, `reports.view_count` still never incremented anywhere.

Resolved decisions:
1. **Split into 6 sub-phases**, ordered by how self-contained/low-risk each is to ship independently — later ones can be reordered or dropped without blocking earlier ones (unlike Phase 2's 2a→2d dependency chain):
   - **4a**: Security response headers (CSP/HSTS/etc.) — zero new dependencies, pure config, implement immediately in this round.
   - **4b**: Automated test suite bootstrap — picks a framework, wires CI-runnable `npm test`, writes the first real tests against `lib/report-acl.ts` per this repo's own `CLAUDE.md` guidance ("Automated test suite ... เริ่มจาก `lib/report-acl.ts` ก่อน").
   - **4c**: Upload/file-serving gaps — AV scan (ClamAV), the missing per-`file_kind` download endpoint, PDF/Excel inline preview + client print, `view_count` increment.
   - **4d**: Auth flexibility & policy — Settings-driven auth provider selection, TOTP 2FA, password policy enforcement.
   - **4e**: Remaining Settings + deferred notifications — storage backend selection, max upload size per `file_kind`, department-wide sharing fan-out, expiry notifications, system notifications, email for high-severity notifications, i18n.
   - **4f**: Observability & ops — structured logging/error tracking, dependency vulnerability scanning in CI, abnormal-auth-pattern alerting, dashboard stat cache/precompute.
2. **This document covers 4a, 4b, and 4f in full** (4a implemented same round; 4b/4f detailed and queued for implementation) — 4c/4d/4e stay overview-only until picked up, matching how `phase2-plan.md`/`phase3-plan.md` were written incrementally sub-phase by sub-phase rather than fully speced up front.
3. **Decisions confirmed with the user (2026-08-17):**
   - 4b test framework: **Vitest**
   - 4d auth-provider-selection and 4e storage-backend-selection: **both aspirational, dropped from scope** — no real second provider/backend to validate a pluggable abstraction against; their decision-free sub-items (2FA, password policy, max upload size, department sharing, expiry/system notifications) stay in scope
   - 4f logging/error-tracking: **self-hosted (`pino`)**, not a hosted vendor
   - ClamAV availability in the target deploy environment (4c) — still open, not yet asked

---

## Sub-phase 4a — Security Response Headers

### 1. `next.config.js` — global `headers()` block

Applied via Next's `headers()` config (runs for every route, HTML and API alike) rather than per-route-handler, so nothing new can accidentally ship unprotected:

```js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ],
  }];
}
```

Resolved decisions on the CSP specifically (the header with real trade-offs, unlike the others which are uncontroversial):
- **`script-src`/`style-src` keep `'unsafe-inline'`** rather than a nonce-based strict CSP. Next.js 14's App Router injects inline bootstrap/hydration scripts and Tailwind/Radix inject inline styles at runtime; a nonce-strict policy needs per-request nonce generation threaded from `middleware.ts` through every `<script>`/`<style>` emission point, which is a materially bigger change than "add response headers" and isn't justified yet for an internal-only tool with no third-party embedded content. Documented here as a known trade-off, not an oversight — revisit if this app ever needs to defend against injected-script XSS from user-generated content rendered as HTML (it currently doesn't: report names/descriptions render as text, not `dangerouslySetInnerHTML`, confirmed via grep).
- **No `report-uri`/`report-to`** — no error-tracking endpoint exists yet to receive CSP violation reports (that's 4f). Add one when 4f ships.
- **HSTS `preload`**: harmless to include even before actually submitting to the HSTS preload list; only takes effect over HTTPS, no-ops on plain HTTP dev (`localhost:3501`).
- **`X-Frame-Options: DENY`** rather than `frame-ancestors 'self'`-only in the CSP: this app never needs to be iframed by itself or anyone else (no embed use case), so deny outright; kept as a header too (not just the CSP directive) for older-browser coverage where CSP `frame-ancestors` isn't honored.

**Files**: `next.config.js` (add `headers()` export)

### Verification (4a)

- `npm run dev` (or `npm run build && npm start`) → `curl -I http://localhost:3501/login` and `curl -I http://localhost:3501/dashboard` both show all 6 headers present with the exact values above
- `curl -I http://localhost:3501/api/reports/browse` (an API route, not just a page) also shows the headers — confirms the `source: '/(.*)'` glob covers `/api/*` too, not just page routes
- Log in through the browser, exercise a few pages (dashboard, report-list, report-edit) — confirms the CSP's `'unsafe-inline'` allowance doesn't need to be any looser than written (no console CSP-violation errors for legitimate app behavior)
- `npx tsc --noEmit` / `npm run build` — no new errors vs the 2-error baseline (`app/api/reports/report/manage/route.ts` upload-service shape mismatch, `components/ui/combobox.tsx` `icon-xs`)

---

## Sub-phase 4b — Automated Test Suite

**Resolved (user, 2026-08-17): Vitest.** Fast, native ESM/TS support, no transform config needed for this Next.js 14 + TS project (unlike Jest). Playwright/E2E deferred — not decided now, separate concern from unit/integration coverage.

### 1. Install & wire `npm test`

`vitest` + `@vitejs/plugin-react` (dev deps only — no runtime impact). `npm test` runs once and exits (CI-safe, not watch mode); `npm run test:watch` for local dev. Needs a way to load `.env`/`.env.local` into the test process the same way `prisma.config.ts` does (`dotenv/config`) since `lib/report-acl.ts` imports `lib/prisma.ts` which reads `DATABASE_URL` at import time.

**Files**: `vitest.config.ts` (new), `package.json` (`test`/`test:watch` scripts + devDependencies)

### 2. First real suite — `lib/report-acl.ts`

Per `CLAUDE.md`'s own guidance ("Automated test suite ... เริ่มจาก `lib/report-acl.ts` ก่อน") and because Phase 2a's original verification already exercised these exact cases manually via a one-off tsx script (`document/phase2-plan.md` sub-phase 2a Verification) — the test cases are already known, this just makes them permanent instead of re-derived by hand every time:

- `resolveReportAcl` resolution order: individual grant wins over role grant wins over `access_level` fallback; no grant + non-`PUBLIC`/non-`PUBLISHED` → deny-all; no grant + `PUBLIC`+`PUBLISHED` → view/favorite/export/print true, edit/delete false
- `visibleReportIdsFor`: union of individual-view-granted + role-view-granted + `PUBLIC`+`PUBLISHED` fallback report ids, no duplicates, admin bypass not exercised here (that's a route-level `routeAcceptted` check, out of this function's scope)

These need real Prisma calls against a database (the functions aren't pure — they query `report_permissions`/`reports`), so this is an **integration test against the real dev DB** (`nextjs_rfs`), not a mocked unit test — matching how this repo has verified everything else so far (real curl/psql, not mocks). Uses a dedicated throwaway report + permission rows per test (created in a `beforeEach`, deleted in `afterEach`) so tests are independent and repeatable, prefixed `VITEST-` the same way manual verification fixtures were prefixed `TEST-`.

**Files**: `lib/report-acl.test.ts` (new)

### Verification (4b)

- `npm test` runs and passes all cases above with zero manual setup beyond `npm install`
- Deliberately break `resolveReportAcl`'s resolution order (e.g. swap the individual/role check order) → the relevant test fails, confirming the suite actually catches regressions and isn't just passing trivially
- Re-run twice in a row → same result both times (fixtures clean up after themselves, no leftover `VITEST-` rows in `report_permissions`/`reports` after a run)
- `npx tsc --noEmit` — no new errors vs baseline (the `.test.ts` file itself must type-check)

## Sub-phase 4c — Upload/File-Serving Gaps

**Resolved (user, 2026-08-17): AV scan (ClamAV) deferred — no daemon confirmed available.** Not wiring a scan-on-upload check against infrastructure that may not exist; revisit if/when a ClamAV instance is actually provisioned. Rest of 4c has no open decisions.

Audit before detailing: there is currently **no single-report detail endpoint for non-admin users at all** — `GET /api/reports/browse` is list-only, and the only download path (`GET /api/reports/[id]/download`) serves just the one cached primary file (`reports.file_path`, synced from whichever `report_files` row `output_type` picks as primary — see `lib/report-file-cache.ts`). A `PRINT_FORM` report's `SAMPLE_FILLED_FORM` file, or any non-primary kind, is only reachable through the admin-only `report-edit` page. This is also why `reports.view_count` has never been incremented anywhere (per Phase 3d's own audit, `phase3-plan.md`) — there's no "view a single report" event to hang it on for a non-admin user.

### 1. `GET /api/reports/[id]` — single-report detail (new)

- Auth: `requireAuth` only (not admin-gated — this is the general "open a report" action every role needs)
- Non-admin: `resolveReportAcl(id, user).can_view` must be true, else 404 (not 403 — matches the existing pattern in `download`/`favorites` of not confirming a restricted report's existence to someone without access)
- Admin: bypass ACL (`routeAcceptted('admin')` check first, same pattern as every other endpoint)
- Returns report metadata + `report_files` where `is_current=true` (all kinds, not just the primary) + the caller's resolved ACL flags (so the UI knows whether to show a print/download button without a second round-trip)
- **Increments `reports.view_count`** atomically (`{ increment: 1 }`, same pattern as `download_count`) — the first real write to this column since it was added
- Logs activity with a new `'view'` `ActivityAction` (additive to the union in `lib/activity-log.ts`, mirrors how `'download'`/`'favorite'`/`'unfavorite'` were each added when their endpoints shipped)

**Files**: `app/api/reports/[id]/route.ts` (new, GET only), `lib/activity-log.ts` (add `'view'` to `ActivityAction`)

### 2. `GET /api/reports/[id]/files/[fileId]/download` — per-`file_kind` download (new)

Same shape as the existing single-report `download` endpoint, but scoped to one specific `report_files` row instead of the cached primary:
- Auth + ACL: identical to `download` (`resolveReportAcl(...).can_export`, admin bypass, `reports.is_downloadable` check)
- 404 if the `report_files` row doesn't exist, doesn't belong to `id`, or `is_current=false` (only ever serves the current version through this general-purpose path — historical versions stay admin-only via the existing version-history UI, which already has its own access)
- Same side effects as `download`: atomic `download_count` increment, `downloads` row, `logActivity('download', ...)`

**Files**: `app/api/reports/[id]/files/[fileId]/download/route.ts` (new, GET only)

### 3. Excel-as-table preview — server-side parse, not client-bundled

**Design decision**: parse `SAMPLE_DATA` files (`xlsx`/`xls`/`csv`) server-side with `exceljs` and return rows as JSON, rather than bundling `exceljs` into the client and parsing in-browser. `exceljs` is a Node-oriented library (its browser build has had bundling friction historically) and this repo already streams every other file server-side first — staying consistent, and it means the response size is controllable (cap rows returned) rather than shipping a whole workbook to the browser to parse client-side.

`GET /api/reports/[id]/files/[fileId]/preview` — same auth/ACL as the download endpoint above (`can_export`, since "preview the data" and "download the data" are the same sensitivity level for a `DATA_REPORT`), 400 if the file's `file_type` isn't a spreadsheet kind. Reads the file from disk, parses the first worksheet (xlsx/xls) or splits lines (csv), returns `{ headers: string[], rows: string[][] }` capped at the first 200 data rows (large-sheet safety valve — this is a preview, not an export; full data still available via the existing download).

**Files**: `app/api/reports/[id]/files/[fileId]/preview/route.ts` (new, GET only), `package.json` (add `exceljs`)

### 4. UI — `ReportPreviewDialog` + wiring

New shared component `components/shared/reportPreviewDialog.tsx` (shadcn `Dialog`, not the existing `right-drawer.tsx` template — that component is an unparameterized placeholder with hardcoded title/content, not actually reusable as-is):
- Opens on a new "Preview" action, fetches `GET /api/reports/[id]` on open
- Lists each current `report_files` row by kind with a "ดาวน์โหลด" button → the new per-file download endpoint
- PDF kinds (`BLANK_FORM`/`SAMPLE_FILLED_FORM`): inline `<embed>` pointed at the download endpoint (browser's native PDF viewer, no library) inside a `.print-area` wrapper
- `SAMPLE_DATA` kind: fetches the new `preview` endpoint, renders `{headers, rows}` via the existing `components/ui/table.tsx` primitives, also inside `.print-area`
- "พิมพ์" button → `window.print()`, scoped to `.print-area` only via a `@media print` rule (`body * { visibility: hidden }`, `.print-area, .print-area * { visibility: visible }`, `.print-area { position: absolute; inset: 0 }`) so the dialog chrome/rest of the page doesn't print
- Wired as a new "Preview" `DropdownMenuItem` in both `reportColumn.tsx` (report-list) and `favReportColumn.tsx` (favorites) — the two existing action-menu locations, alongside the current Download/Edit/Favorite items. Card view (`reportCards.tsx`) has no action menu at all today (pre-existing gap, not introduced here) - left alone, out of scope.

**Files**: `components/shared/reportPreviewDialog.tsx` (new), `app/(auth)/reports/report-list/components/reportColumn.tsx` (add menu item), `app/(auth)/reports/favorites/components/favReportColumn.tsx` (add menu item)

### Verification (4c)

- `GET /api/reports/[id]` on a report the user can view → 200 with metadata + current files + acl flags; `view_count` +1; on one the user can't view → 404 (not 403); as admin on any report → 200 regardless of ACL
- `GET /api/reports/[id]/files/[fileId]/download` on a `SAMPLE_FILLED_FORM` row of a `PRINT_FORM` report → correct PDF bytes, `download_count` +1, `downloads` row created; on a non-current (superseded) file id → 404
- `GET /api/reports/[id]/files/[fileId]/preview` on a real `.xlsx` → `{headers, rows}` matches the file's actual content, capped at 200 rows on a larger sheet; on a PDF file id → 400
- Open the Preview dialog in the browser on a `PRINT_FORM` report → PDF renders inline; on a `DATA_REPORT` → table renders with real data; click Print on both → only the preview content appears in the print dialog, not the rest of the page
- `npx tsc --noEmit` — no new errors vs baseline (2 pre-existing)

## Sub-phase 4d — Auth Flexibility & Policy

**Resolved (user, 2026-08-17): auth provider selection (Local DB / External API / Email OTP) is aspirational, not real near-term demand — dropped from scope entirely.** Not designing a pluggable auth adapter interface with only one implementation to validate it against.

**Further decisions confirmed (user, 2026-08-17):**
- 2FA backup codes: **included** (10 single-use codes, hashed, new table) — without them a lost authenticator device is a permanent lockout (no admin-assisted recovery path exists either)
- Password policy: **8 characters minimum, at least 1 letter + 1 number** — unintrusive baseline, not the stricter NIST-adjacent option
- `password_changed_at`: **tracked, not enforced** — no forced periodic rotation. Current NIST guidance (SP 800-63B) actually recommends against forced rotation; it tends to produce weaker passwords (incrementing a digit). Just populate the column for future audit/display use.

Audit before detailing: `users.two_factor_enabled`/`two_factor_secret` exist but are **never read or written anywhere in the codebase** (confirmed via grep) — `login/route.ts` doesn't even select them. There is no backup-code storage at all. There is no self-service "change my own password" flow either — the only two places a password is ever written are the **admin-driven** create (`app/api/users/user/route.ts`) and update (`app/api/users/user/update/route.ts`) routes, both of which currently validate password with `z.string().min(1, ...)` — i.e. no policy at all, a single non-empty character passes. `app/(auth)/profile/page.tsx` has a literal placeholder card ("พื้นที่สำหรับการตั้งค่าเพิ่มเติม เช่น เปลี่ยนรหัสผ่าน...") — the natural, already-intended slot for 2FA enrollment UI.

**Security note (this touches login — CLAUDE.md's "extra care" list):** a 6-digit TOTP code is only 1,000,000 combinations and brute-forceable within its 30s validity window if the verify step isn't rate-limited. The new `verify-2fa` endpoint reuses the existing IP-keyed `checkRateLimit`/`resetRateLimit` (`lib/rate-limit.ts`) rather than inventing a second limiter.

### 1. Schema — backup codes table

```prisma
model two_factor_backup_codes {
  id         String    @id
  user_id    String
  code_hash  String
  used_at    DateTime?
  created_at DateTime  @default(now())
  users      users     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
}
```
Plus the inverse relation field on `model users`.

> ⚠️ **Incident + standing gotcha found running this migration**: `npx prisma migrate dev --name add_two_factor_backup_codes` generated a migration that (correctly) created the new table, but **also** included `DROP INDEX` on all 4 of the Phase 1 search indexes (`reports_search_vector_idx` + 3 trigram) and `ALTER TABLE reports ALTER COLUMN search_vector DROP DEFAULT` — the latter failed (`P3018`, Postgres rejects dropping a default on a *generated* column), but by then **the DROP INDEX statements had already committed** (this migration did not run as a single all-or-nothing transaction). Root cause: `search_vector` is declared as `Unsupported("tsvector")` (Prisma has no first-class generated-column support), and the 4 indexes were declared only as raw SQL in an old migration file, never in the Prisma schema DSL — so every `migrate dev` shadow-DB diff sees schema.prisma as "wanting" to drop indexes it doesn't know exist. This is the exact same category of problem ของค้าง #1 root-caused, just triggered fresh by the next schema change instead of being a leftover from Feb-Mar 2026.
>
> **Fixed in two parts:**
> 1. Recreated the 4 indexes via direct SQL immediately (verified restored, then re-verified search still returns correct results via the live `/api/reports/browse` endpoint) and manually corrected the generated migration.sql to contain only the real intended change (the `CREATE TABLE`/`CREATE INDEX`/`AddForeignKey` for `two_factor_backup_codes`), then `prisma migrate resolve --applied` on the corrected file.
> 2. **Closed the recurring trigger for good**: added `@@index(..., type: Gin, map: "...")` declarations for all 4 indexes directly to `reports` in `schema.prisma` (Prisma 7's extended-index-types support, GA, no preview flag needed — `ops: raw("gin_trgm_ops")` for the trigram ones), using `map:` to match the exact existing index names so Prisma recognizes them as already-satisfied rather than proposing near-duplicates. Confirmed via `migrate diff --from-config-datasource --to-schema`: diff shrank from "drop 4 indexes + alter column" down to just the one cosmetic `DROP DEFAULT` line, which cannot be eliminated (Prisma limitation with `Unsupported()` + generated columns) but is at least now harmless-if-caught and easy to spot.
>
> **Standing rule for every future migration in this repo**: after `npx prisma migrate dev --name ...`, always check the generated `migration.sql` for a `search_vector` `ALTER COLUMN ... DROP DEFAULT` line before letting it apply (or use `--create-only` to inspect first) — strip that one line, since it always fails against a generated column and (as this incident showed) a failure partway through a migration does not necessarily roll back everything that ran before it in the same file.

**Files**: `prisma/schema.prisma`, new migration

### 2. `lib/two-factor.ts` — TOTP helper (new deps: `otplib`, `qrcode`)

- `generateSecret()` → `otplib.authenticator.generateSecret()`
- `buildOtpauthUrl(secret, username)` → `otplib.authenticator.keyuri(username, 'RFS Report Finder', secret)`
- `verifyTotp(secret, code)` → `otplib.authenticator.verify({ token: code, secret })`
- `generateBackupCodes()` → 10 codes, format `xxxx-xxxx` (random alphanumeric via `crypto.randomBytes`), returns `{ plaintext: string[], hashes: Promise<string>[] }` (hash with `bcryptjs`, same cost factor as password hashing elsewhere)

**Files**: `lib/two-factor.ts` (new)

### 3. Enrollment endpoints — `app/api/auth/2fa/*`

All `requireAuth`-gated (self-service, any role):
- **`POST /api/auth/2fa/setup`**: 400 if already enabled (must disable first to re-enroll — no silent secret replacement while active). Generates a secret, saves to `users.two_factor_secret` (enabled stays `false` until confirmed), returns `{ secret, otpauthUrl, qrCodeDataUrl }` (`qrcode.toDataURL(otpauthUrl)`).
- **`POST /api/auth/2fa/confirm`** — body `{ code }`. Verifies against the pending secret. On success: `two_factor_enabled=true`, generates + stores 10 hashed backup codes, returns the **plaintext codes once** (never retrievable again — same one-time-reveal pattern as any secret). `logActivity('update', 'user', userId, '2FA enabled')`.
- **`POST /api/auth/2fa/disable`** — body `{ password }` (re-auth with current password, not just being logged in, since this lowers account security). Verifies via `bcrypt.compare`. On success: `two_factor_enabled=false`, `two_factor_secret=null`, delete all backup code rows. `logActivity('update', 'user', userId, '2FA disabled')`.
- **`GET /api/auth/2fa/status`** — `{ enabled: boolean }`, fresh DB read (not trusted from the JWT payload, which is stale relative to live 2FA state).

**Files**: `app/api/auth/2fa/setup/route.ts`, `.../confirm/route.ts`, `.../disable/route.ts`, `.../status/route.ts` (all new)

### 4. Login flow — two-step when 2FA is enabled

`app/api/auth/login/route.ts` (modify): select `two_factor_enabled` in the user query. After password verifies, if enabled:
- Generate a random pending token (`crypto.randomBytes(24).toString('hex')`)
- Store `pending2fa:<token> → userId` in Redis, TTL 300s
- Return `{ success: true, requires2fa: true, pendingToken }` — **no cookie set yet**, full session withheld until 2FA verifies
- **Fails closed, not open, if Redis is unreachable** — unlike `lib/rate-limit.ts`'s deliberate fail-open (rate limiting is defense-in-depth; withholding a session pending 2FA is the actual security boundary here, so a Redis outage must not silently grant a full session)

`app/api/auth/login/verify-2fa/route.ts` (new): body `{ pendingToken, code }`.
- `checkRateLimit(ip)` first (same limiter as the main login endpoint)
- Look up `pending2fa:<pendingToken>` in Redis → 401 "session expired, log in again" if missing/expired
- Try `code` as a TOTP code first; if that fails, try it against unused backup codes (`bcrypt.compare` against each unused row) — mark the matched row `used_at=now()` on success
- On success: delete the Redis key (single-use), `resetRateLimit(ip)`, create the full JWT + cookie (identical to normal login), `logActivity('login', ...)`, return the same response shape as a normal login
- On failure: 401 "invalid code", Redis key stays (retry allowed within the TTL window)

**Files**: `app/api/auth/login/route.ts` (modify), `app/api/auth/login/verify-2fa/route.ts` (new)

### 5. UI

- `app/login/page.tsx` (modify): on `requires2fa: true`, switch to a second step (code input, "ใช้ backup code แทน" toggle) that posts to `verify-2fa` with the `pendingToken`, then proceeds exactly like a normal successful login
- `components/shared/twoFactorSettings.tsx` (new, client component) replacing the placeholder card in `app/(auth)/profile/page.tsx`: fetches `GET /api/auth/2fa/status` on mount; **disabled state** shows an "เปิดใช้งาน 2FA" button → calls `setup` → shows QR code + secret fallback text + confirm-code input → calls `confirm` → shows the 10 backup codes once with an explicit "ฉันบันทึกโค้ดเหล่านี้แล้ว" acknowledgment before closing; **enabled state** shows "ปิดใช้งาน 2FA" button → password prompt → calls `disable`

**Files**: `app/login/page.tsx` (modify), `components/shared/twoFactorSettings.tsx` (new), `app/(auth)/profile/page.tsx` (modify — swap in the new component)

### 6. Password policy

- `lib/password-policy.ts` (new): exports `PASSWORD_POLICY_MESSAGE` (Thai, for error responses) and a zod `.refine()` (`/^(?=.*[A-Za-z])(?=.*\d).{8,}$/`) — one source of truth, not duplicated across the two call sites
- `app/api/users/user/route.ts`: `userZod.password` uses the shared refinement instead of bare `min(1)`; set `password_changed_at: new Date()` in `createParams`
- `app/api/users/user/update/route.ts`: same refinement on the optional password field; set `password_changed_at: new Date()` whenever `data.password` is provided
- No rotation enforcement, no UI surfacing of "days since last change" — tracking only, per the resolved decision; not building a display feature nobody asked for

**Files**: `lib/password-policy.ts` (new), `app/api/users/user/route.ts` (modify), `app/api/users/user/update/route.ts` (modify)

### Verification (4d)

- Enroll 2FA: `setup` → scan QR with a real authenticator app (or compute TOTP from the returned `secret` directly) → `confirm` with a valid code → `two_factor_enabled=true` in DB, 10 backup code rows created (hashed, not plaintext)
- `confirm` with a wrong code → stays disabled, no backup codes created
- Log out, log back in with 2FA enabled → normal login returns `requires2fa:true` + `pendingToken`, no cookie set; `verify-2fa` with a valid current TOTP code → full session cookie granted, can access authenticated routes
- `verify-2fa` with a wrong code 6 times in a row from one IP → rate-limited (429), matching the main login endpoint's threshold
- `verify-2fa` with a backup code → succeeds once, same code rejected on a second attempt (marked used)
- `disable` with the wrong password → 401, 2FA stays enabled; with the correct password → `two_factor_enabled=false`, secret cleared, backup code rows deleted
- Create a user with password `"short1"` (7 chars) → 400; `"noNumbers"` (no digit) → 400; `"valid1pw"` → 201, `password_changed_at` set
- Update a user's password through the admin update route → `password_changed_at` refreshes to now
- `npx tsc --noEmit` — no new errors vs baseline (2 pre-existing)

## Sub-phase 4e — Remaining Settings + Deferred Notifications

**Resolved (user, 2026-08-17): storage backend selection (local/MinIO/S3) is aspirational, not real near-term demand — dropped from scope entirely.** Not designing a storage abstraction with only the local filesystem to validate it against.

i18n (`next-intl`) is a large, all-or-nothing UI sweep (every hardcoded Thai/English string in every component) — worth scoping as its own dedicated pass rather than folding into a mixed sub-phase; flagged here as needing its own future plan doc, not detailed further in this one.

Audit before detailing (2026-08-18): `ShareType.DEPARTMENT` and the `NotificationType` values `REPORT_EXPIRING`/`SYSTEM_STORAGE_LOW`/`SYSTEM_MAINTENANCE` **already exist in `schema.prisma`, unused** — same shape as `report_shares`/`notifications` themselves before 3b/3c (schema-ready, code-empty). `lib/reportFileUploadServices.ts`'s `uploadReportFile()` already accepts a `maxFileSizeBytes` param (added in 4c, never actually passed by its one caller). Grepped repo-wide for any cron/scheduler mechanism (`cron`, `node-cron`, `setInterval`, `scheduled`) — confirmed **there is truly none**, not even a stub; the only `setInterval` in the codebase is `notification-bell.tsx`'s client-side 30s poll. `lib/menu-list.ts` (the real, rendered sidebar source — not the DB `menus` table) already has a static "System Settings" group with `/settings/general` and `/settings/storage` entries pointing at pages that don't exist yet.

**Decisions made while detailing this sub-phase (no open questions left for the user — these are implementation-detail choices, not product trade-offs):**
1. **Per-kind max size stays a hardcoded const map in `lib/reportFileUploadServices.ts`, not a `settings`-table-backed value.** The plan's own wording ("config value") is satisfied by a named constant; a DB-editable value would need an admin UI for a single-number setting with no near-term reason to change it at runtime — same "don't build an abstraction with only one real use" reasoning already applied to auth-provider/storage-backend in 4d/4e's opening decisions.
2. **Expiry/storage checks are exposed as manually-invokable admin-only endpoints (`POST /api/system/jobs/*`), not a lazy check-on-read.** Unlike 3b's expired-link check (a read that only needs to be correct at the moment it's read), firing a *notification* on every matching request would either spam (no de-dupe) or need de-dupe state anyway — so the job-endpoint shape ends up simpler, and doubles as the hook this repo will eventually wire to whatever external scheduler the deploy environment actually has (Windows Task Scheduler / cron / Vercel Cron — not decided, and not this repo's concern to decide, hence "no new infra": we don't stand up a scheduler ourselves, just provide the endpoint).
3. **De-dupe for `REPORT_EXPIRING`**: new nullable `report_shares.expiry_notified_at` column — set once notified, checked on the next job run so the same share never re-notifies. This is the one schema change in this sub-phase (small, additive, same shape as 4d's `used_at` on backup codes).
4. **De-dupe for `SYSTEM_STORAGE_LOW`**: no new column — check for an existing unread `SYSTEM_STORAGE_LOW` notification for any admin within the last 24h before creating another, since this is a recurring-until-acknowledged condition rather than a one-time event like a specific share expiring.
5. **Storage threshold + maintenance-mode flag live in the existing `settings` table** (`STORAGE_LIMIT_BYTES`, `MAINTENANCE_MODE` keys) — this table has exactly one seeded row and zero real consumers today; this is its first real use, for exactly the global-config use case it was already shaped for.
6. **Maintenance-mode is notification-only, not enforced.** Toggling the `MAINTENANCE_MODE` setting broadcasts a `SYSTEM_MAINTENANCE` notification to every user on both the on→off and off→on transition; it does **not** gate traffic, show a banner, or block writes anywhere. Actually enforcing maintenance mode (middleware-level write-blocking, a global banner) is a separate, larger feature not implied by "system notifications" and not built here.
7. **DEPARTMENT share fan-out excludes the acting admin** if they happen to belong to the target department (mirrors the `REPORT_UPDATED` favorites fan-out precedent from Phase 3c — the actor doesn't get notified about their own action).

### 1. Schema — `report_shares.expiry_notified_at`

```prisma
model report_shares {
  ...
  expiry_notified_at DateTime?
  ...
}
```
Nullable, no default — `NULL` means "not yet warned." Also add `'system'` to `lib/activity-log.ts`'s `ActivityEntity` union (additive, same pattern as 4c's `'view'` on `ActivityAction`) so settings changes and job runs can be logged meaningfully instead of misfiled under `'report'`/`'user'`.

**Files**: `prisma/schema.prisma`, new migration, `lib/activity-log.ts`

### 2. Per-`file_kind` max upload size

`lib/reportFileUploadServices.ts`: replace the flat `DEFAULT_MAX_SIZE = 20 * 1024 * 1024` with a `MAX_SIZE_BY_KIND` map (`BLANK_FORM`/`SAMPLE_FILLED_FORM` → 10 MB, PDF form templates shouldn't need more; `SAMPLE_DATA` → 20 MB, keeps today's effective limit since spreadsheets legitimately run larger). `uploadReportFile`'s existing `maxFileSizeBytes` parameter defaults to `MAX_SIZE_BY_KIND[fileKind]` instead of a flat constant — since default parameter expressions can reference an earlier parameter in the same signature, **no call site needs to change** (`app/api/reports/[id]/files/route.ts`'s 2-arg call now gets a kind-specific limit automatically).

**Files**: `lib/reportFileUploadServices.ts`

### 3. Department-wide share fan-out

`app/api/reports/[id]/shares/route.ts` POST handler: add an `else if (data.share_type === 'DEPARTMENT' && sharedWith)` branch alongside the existing `USER` branch — `prisma.users.findMany({ where: { department_id: sharedWith, id: { not: user?.id } } })`, then `createNotification(u.id, 'REPORT_SHARED', ...)` per member (same title/message shape as the USER case, department name substituted in). No new helper needed — this is the only two-branch fan-out in the codebase, doesn't justify a `notifyUsers()` abstraction yet.

**Files**: `app/api/reports/[id]/shares/route.ts`

### 4. `POST /api/system/jobs/check-report-expiry` (new)

Admin-only (`routeAcceptted('admin')`). Finds `report_shares` where `expires_at` is between now and now+3 days (`EXPIRY_WARNING_DAYS = 3`, const) and `expiry_notified_at IS NULL`. For each: `createNotification(shared_by, 'REPORT_EXPIRING', ...)` (notifies whoever created the share, not the recipient — they're the one who can renew/extend it), then set `expiry_notified_at = now()`. Returns `{ notified: number }`. `logActivity('update', 'system', ...)` summarizing the run.

**Files**: `app/api/system/jobs/check-report-expiry/route.ts` (new)

### 5. `GET`/`PUT /api/settings/system` (new)

Admin-only. `GET` reads (or lazily creates with defaults if missing) the `STORAGE_LIMIT_BYTES` and `MAINTENANCE_MODE` rows in `settings`. `PUT` upserts both (zod-validated: positive integer bytes, boolean), and if `MAINTENANCE_MODE` actually changes value, broadcasts `SYSTEM_MAINTENANCE` to every user (`prisma.users.findMany({ select: { id: true } })`, loop `createNotification`) with a message reflecting which direction the transition went. `logActivity('update', 'system', ...)` on every successful `PUT`.

**Files**: `app/api/settings/system/route.ts` (new)

### 6. `POST /api/system/jobs/check-storage` (new)

Admin-only. Reuses the same `report_files.aggregate({ _sum: { file_size: true } })` pattern as `GET /api/dashboard/summary`, compares against `STORAGE_LIMIT_BYTES` from `settings` (skip entirely if unset — no threshold configured yet means nothing to compare against). If over threshold: check for an existing unread `SYSTEM_STORAGE_LOW` notification for any admin created in the last 24h; if none, `createNotification` to every `ADMIN`/`SUPER_ADMIN` user. Returns `{ over_threshold: boolean, current_bytes, limit_bytes }`.

**Files**: `app/api/system/jobs/check-storage/route.ts` (new)

### 7. UI — `/settings/general` (new)

`lib/menu-list.ts` already links here (dead until now). New page `app/(auth)/settings/general/page.tsx` (client component, same fetch-on-mount/PUT-on-save shape as `twoFactorSettings.tsx`/`DashboardAnalytics.tsx`): storage limit input (MB, converted to/from bytes), maintenance-mode switch, save button. No client-side role gate (matches this repo's existing pattern — e.g. `role-management/roles/page.tsx` has none either; the API's `routeAcceptted('admin')` check is the actual boundary, a non-admin just sees a failed fetch).

**Files**: `app/(auth)/settings/general/page.tsx` (new)

### Verification (4e)

- Upload a `SAMPLE_FILLED_FORM` PDF just over 10 MB → 400 with the correct "Maximum allowed size is 10 MB" message; a `SAMPLE_DATA` `.xlsx` at 15 MB (under its 20 MB limit) → succeeds
- Create a `DEPARTMENT` share targeting a department with 3 members (including the acting admin) → exactly 2 `notifications` rows created (admin excluded), not 3
- Create a `LINK` share with `expires_at` 2 days out, then hit `check-report-expiry` → 1 notification to `shared_by`, `expiry_notified_at` set; hit it again immediately → 0 new notifications (already notified); a share expiring in 10 days → not notified (outside the 3-day window)
- `PUT /api/settings/system` with `MAINTENANCE_MODE` flipped false→true → every user gets a `SYSTEM_MAINTENANCE` notification; flip back true→false → another round for the "ended" message
- Push total `report_files` size over a manually-set low `STORAGE_LIMIT_BYTES`, hit `check-storage` → admins get `SYSTEM_STORAGE_LOW`; hit it again within 24h → no duplicate; below threshold → `over_threshold: false`, no notification
- Non-admin hitting any of the 3 new job/settings endpoints → 403; unauthenticated → 401
- `/settings/general` page loads, shows current values, save round-trips correctly
- `npx tsc --noEmit` — no new errors vs baseline (2 pre-existing)

## Sub-phase 4f — Observability & Ops

**Resolved (user, 2026-08-17): self-hosted (`pino`), not a hosted vendor.** No external account/DSN to provision; works offline; simplest fit for an internal-only tool.

### 1. `lib/logger.ts` — structured logger ✅ implemented

`pino` instance, pretty-printed in development (`pino-pretty`, dev dependency only) and plain JSON in production (so log aggregation tooling, if ever added, gets parseable lines). Replaces ad hoc `console.log`/`console.error` calls in route handlers over time — **not a mass find-and-replace across the whole codebase in this sub-phase** (that's a large, low-value mechanical sweep); wired into the highest-value existing spot first: `logActivity`'s swallowed-error path (`lib/activity-log.ts`), which previously failed silently with zero trace.

**Scope correction found during implementation**: `getCurrentUser`/`getAuthFromRequest`'s swallowed catches in `lib/auth.ts` are **not** touched, on purpose — `middleware.ts` imports `getAuthFromRequest` and runs on the Edge runtime, which can't bundle `pino`'s worker-thread-based transports (confirmed: this is the exact same constraint documented in `lib/rate-limit.ts`'s own comment for why it's kept out of `lib/auth.ts` — `ioredis` can't bundle for Edge either). Importing `lib/logger.ts` into `lib/auth.ts` would break the middleware bundle. Left as `console.error` for now; revisit only alongside a real plan for Edge-safe logging (e.g. a fetch-based log shipper instead of pino's Node-only transports), not folded into this pass.

**Files**: `lib/logger.ts` (new), `lib/activity-log.ts` (swap `console.error` → `logger.error`)

### 2. Dependency vulnerability scanning (CI) ✅ implemented

**Resolved (user, 2026-08-18): yes, stand up CI + this item together.** `.github/workflows/ci.yml` (new — first CI config for this repo): on push to `main`/PR, spins up a `postgres:16` service container, `npm ci` → `prisma generate` → `prisma migrate deploy` → `prisma/seed-ci.ts` (new — minimal idempotent seed of just the role/category/user row `lib/report-acl.test.ts` needs via `findFirstOrThrow`, kept separate from the fragile, mostly-commented-out `prisma/seed.ts` rather than trying to make that script CI-safe) → `tsc --noEmit` → `npm run build` → `npm test` → `npm audit --audit-level=high`.

**Scope correction found during implementation**: running `npm audit --audit-level=high` for real (first time this repo has ever run it in CI) surfaced pre-existing high/critical advisories unrelated to this task — `next@14.2.18` (critical, multiple accumulated CVEs), `postcss` (high, via `next`), `sharp`/libvips (high, `CVE-2026-33327/33328/35590/35591`). Fixing any of these means a breaking major-version bump (`next@16.x`, `sharp@0.35.x`), which is a materially bigger and riskier change than "add a CI config" and needs its own deliberate plan. The audit step is `continue-on-error: true` for now (still runs and logs full output every run, just doesn't fail the build) — see `document/00-progress.md` ของค้าง #6 for the full advisory list and the standing decision to flip this to blocking once a Next upgrade is planned.

### 3. Abnormal auth-pattern alerting ✅ implemented

`GET /api/dashboard/auth-alerts?hours=24` (new, `routeAcceptted('admin')`-gated like the rest of `/api/dashboard/*`) — groups `activity_logs` where `action='login_failed'` by `ip_address` within the window (default 24h, max 168h), returns IPs with ≥5 attempts (`attempts`, `targeted_accounts` = distinct `user_id` count, `first_attempt_at`, `last_attempt_at`), capped at top 20 by attempt count. Smallest useful version per the resolved decision: a dashboard card, no external delivery channel. Wired into `DashboardAnalytics.tsx` as a new card after the top-reports table.

### 4. Dashboard stat cache/precompute — still deferred

No action this pass, per the original resolution: revisit once real usage volume makes the live-query approach measurably slow — not measured to be a problem yet on this dataset size.

### Verification (4f)

- Trigger a swallowed-error path (e.g. temporarily point `DATABASE_URL` at an unreachable host, hit an endpoint that calls `logActivity`) → structured log line appears with level/timestamp/error detail instead of a bare `console.error` string
- `npx tsc --noEmit` / `npm run build` — no new errors vs baseline
- `GET /api/dashboard/auth-alerts` with no admin cookie → 401; insert ≥5 synthetic `login_failed` rows for one `ip_address`, hit the endpoint as admin → that IP appears with the correct `attempts` count; below-threshold IPs don't appear — done: minted a `SUPER_ADMIN` JWT directly via `lib/auth.ts`'s `createToken` against a real DB user, inserted 6 synthetic rows for a test IP, confirmed 401 with no cookie and the correct `attempts:6` with the cookie, cleaned up the rows after
- `/dashboard` page renders the new card without breaking the existing ones — done: page compiled and returned 200 with the admin cookie; confirmed the `auth-alerts` fetch call and route are present in the built `.next/server`+`.next/static` bundles (raw-HTML grep is inconclusive for client-fetched content, so bundle presence was used instead)
- CI: `npx prisma migrate deploy` + `prisma/seed-ci.ts` against a fresh Postgres, then `npm test` — done locally against the existing dev DB (idempotent re-run confirmed, finds existing rows rather than duplicating); the actual GitHub Actions run itself has not been observed yet (needs a real push to trigger)

---

### Verification (4c-4e remaining items)

Not written yet — each item gets its own Verification list when picked up for real implementation, per this repo's phase-planning convention (matches how 3a-3e were each detailed just before their own implementation, not all up front).
