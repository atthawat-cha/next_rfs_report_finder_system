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

## Sub-phase 4c — Upload/File-Serving Gaps (overview)

No open decisions blocking this one — pure implementation once picked up:
- Per-`file_kind` download endpoint (`GET /api/reports/[id]/files/[fileId]/download` or similar) so `SAMPLE_FILLED_FORM` and other non-primary `report_files` rows are reachable by non-admin users, not just the single cached primary file.
- PDF inline preview (`<embed>`/`<iframe>` pointed at the download endpoint) and Excel-as-table preview (`exceljs` parse, new dependency - small and single-purpose, lower-risk than the 4b/4d/4e decisions).
- Client-side print (`window.print()` + `@media print` stylesheet) for both the PDF preview and the data-table preview.
- `reports.view_count` increment — needs a real "view" event distinct from "download" (currently doesn't exist for non-admin users; browse is list-only, no `GET /api/reports/[id]` single-report view endpoint for them) - smallest scope: increment on that new single-view endpoint if/when the preview work above creates one.

## Sub-phase 4d — Auth Flexibility & Policy (overview, scope narrowed)

**Resolved (user, 2026-08-17): auth provider selection (Local DB / External API / Email OTP) is aspirational, not real near-term demand — dropped from scope entirely.** Not designing a pluggable auth adapter interface with only one implementation to validate it against.

Remaining scope, both self-contained and schema-ready (`users.two_factor_enabled`/`two_factor_secret`, `users.password_changed_at` already exist):
- TOTP 2FA: enroll (generate secret + QR, verify one code before enabling), verify-on-login step, backup codes (not yet scoped in schema — needs a decision on storage shape when this is picked up for real)
- Password policy: minimum complexity on set/change, `password_changed_at` enforcement (force change after N days) — needs the actual policy values (min length? rotation period?) confirmed when picked up, not guessed here

## Sub-phase 4e — Remaining Settings + Deferred Notifications (overview, scope narrowed)

**Resolved (user, 2026-08-17): storage backend selection (local/MinIO/S3) is aspirational, not real near-term demand — dropped from scope entirely.** Not designing a storage abstraction with only the local filesystem to validate it against.

i18n (`next-intl`) is a large, all-or-nothing UI sweep (every hardcoded Thai/English string in every component) — worth scoping as its own dedicated pass rather than folding into a mixed sub-phase; flagged here as needing its own future plan doc, not detailed further in this one.

Remaining decision-free scope: max upload size per `file_kind` (config value + validation, no new infra), department-wide share fan-out (`share_type=DEPARTMENT` notifications, deferred from 3b/3c specifically pending this call), expiry-approaching notifications (share links — nothing else currently has an expiry), system notifications (storage-threshold / maintenance-mode).

## Sub-phase 4f — Observability & Ops

**Resolved (user, 2026-08-17): self-hosted (`pino`), not a hosted vendor.** No external account/DSN to provision; works offline; simplest fit for an internal-only tool.

### 1. `lib/logger.ts` — structured logger

`pino` instance, pretty-printed in development (`pino-pretty`, dev dependency only) and plain JSON in production (so log aggregation tooling, if ever added, gets parseable lines). Replaces ad hoc `console.log`/`console.error` calls in route handlers over time — **not a mass find-and-replace across the whole codebase in this sub-phase** (that's a large, low-value mechanical sweep); wire it into new code going forward and the highest-value existing spots first: `logActivity`'s swallowed-error path (`lib/activity-log.ts`), `getCurrentUser`/`getAuthFromRequest`'s swallowed catches (`lib/auth.ts`) — these currently fail silently with zero trace, which is exactly what structured logging is for.

**Files**: `lib/logger.ts` (new), `lib/activity-log.ts` + `lib/auth.ts` (swap `console.error` → `logger.error` in the swallowed-catch paths only)

### 2. Dependency vulnerability scanning (CI)

**No CI exists in this repo at all** (`.github/workflows/` doesn't exist) — this item needs a CI pipeline stood up before "scanning in CI" means anything, which is a bigger scope decision (what else should CI run? just `npm audit`, or also `tsc --noEmit`/`npm run build`/the new `npm test` from 4b?) than this one line originally implied. Splitting it out: propose a minimal `.github/workflows/ci.yml` that runs `tsc --noEmit` + `npm run build` + `npm test` + `npm audit --audit-level=high` on push/PR — confirm with the user before adding (first CI config for this repo, worth a deliberate look rather than folding into a drive-by commit).

### 3. Abnormal auth-pattern alerting

Query over `activity_logs` (already has everything needed: `action`, `ip_address`, `created_at`) — e.g. N `login_failed` from the same `ip_address` within a window. "Alerting" needs a delivery channel (email/Slack/just a dashboard widget?) — smallest useful version: a dashboard card showing recent spikes, no external delivery channel yet (matches 4f's self-hosted, no-new-external-service resolution above).

### 4. Dashboard stat cache/precompute

Deferred from Phase 3d, revisit once real usage volume makes the live-query approach measurably slow — not measured to be a problem yet on this dataset size, so no action in this pass.

### Verification (4f)

- Trigger a swallowed-error path (e.g. temporarily point `DATABASE_URL` at an unreachable host, hit an endpoint that calls `logActivity`) → structured log line appears with level/timestamp/error detail instead of a bare `console.error` string
- `npx tsc --noEmit` / `npm run build` — no new errors vs baseline

---

### Verification (4c-4e remaining items)

Not written yet — each item gets its own Verification list when picked up for real implementation, per this repo's phase-planning convention (matches how 3a-3e were each detailed just before their own implementation, not all up front).
