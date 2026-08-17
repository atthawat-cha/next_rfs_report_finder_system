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
2. **This document covers 4a in full, fully detailed and implemented in this round** — 4b-4f are overview-only (scope + the one open question each needs answered before detailing), matching how `phase2-plan.md`/`phase3-plan.md` were written incrementally sub-phase by sub-phase rather than fully speced up front.
3. **4b-4f each have at least one decision only the user can make** (test framework choice, error-tracking vendor/self-hosted, i18n library, ClamAV daemon availability in the target deploy environment) — flagged per sub-phase below rather than guessed, since guessing wrong on a new dependency is expensive to unwind later.

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

## Sub-phase 4b — Automated Test Suite (overview, needs a decision first)

**Open question for the user**: which test framework? Recommendation: **Vitest** (fast, native ESM/TS support, no config needed for a Next.js + TS project, unlike Jest's transform setup) for unit/integration tests against `lib/*` and route handlers; Playwright only if/when E2E browser coverage is actually wanted (bigger lift, separate decision). Not choosing this unprompted because it's a new dependency the team will live with long-term.

Scope once decided: `npm test` script, CI-runnable (no interactive watch mode by default), first real suite against `lib/report-acl.ts`'s `resolveReportAcl`/`visibleReportIdsFor` (per this repo's own `CLAUDE.md` — the most security-sensitive pure-logic module, and the one Phase 2a's own verification already exercised manually via a one-off tsx script, so the test cases are already known).

## Sub-phase 4c — Upload/File-Serving Gaps (overview)

No open decisions blocking this one — pure implementation once picked up:
- Per-`file_kind` download endpoint (`GET /api/reports/[id]/files/[fileId]/download` or similar) so `SAMPLE_FILLED_FORM` and other non-primary `report_files` rows are reachable by non-admin users, not just the single cached primary file.
- PDF inline preview (`<embed>`/`<iframe>` pointed at the download endpoint) and Excel-as-table preview (`exceljs` parse, new dependency - small and single-purpose, lower-risk than the 4b/4d/4e decisions).
- Client-side print (`window.print()` + `@media print` stylesheet) for both the PDF preview and the data-table preview.
- `reports.view_count` increment — needs a real "view" event distinct from "download" (currently doesn't exist for non-admin users; browse is list-only, no `GET /api/reports/[id]` single-report view endpoint for them) - smallest scope: increment on that new single-view endpoint if/when the preview work above creates one.

## Sub-phase 4d — Auth Flexibility & Policy (overview)

**Open question for the user**: is "auth provider selection" (Local DB / External API / Email OTP) an actual near-term requirement or a nice-to-have carried over from the original spec? It's the single biggest unknown-scope item in this file — "External API" provider means designing an entire pluggable auth adapter interface with no second provider to validate the abstraction against yet. Recommend confirming real demand before designing it, rather than building a speculative plugin system.

TOTP 2FA and password-policy enforcement are smaller, self-contained, and schema already has the 2FA columns (`users.two_factor_enabled`/`two_factor_secret`) waiting - these could ship independently of the provider-selection question.

## Sub-phase 4e — Remaining Settings + Deferred Notifications (overview)

**Open question for the user**: storage backend selection (local/MinIO/S3) implies an actual second backend to test against - is there an S3-compatible target (MinIO locally, real S3/R2 in some environment) available, or is this speculative? Same shape of risk as 4d's external auth provider: designing a storage abstraction with only one real implementation to validate it against.

i18n (`next-intl`) is a large, all-or-nothing UI sweep (every hardcoded Thai/English string in every component) - worth scoping as its own dedicated pass rather than folding into a mixed sub-phase; flagged here as needing its own future plan doc, not detailed further in this one.

Smaller, decision-free items that could ship first in this sub-phase: max upload size per `file_kind` (config value + validation, no new infra), department-wide share fan-out (`share_type=DEPARTMENT` notifications, deferred from 3b/3c specifically pending this call), expiry-approaching notifications (share links / nothing else currently has an expiry), system notifications (storage-threshold / maintenance-mode).

## Sub-phase 4f — Observability & Ops (overview)

**Open question for the user**: self-hosted (pino + local log files/ELK) or a hosted error-tracking vendor (Sentry, etc.)? Vendor choice affects whether an API key/DSN needs to be provisioned before any code can be written - can't meaningfully implement this sub-phase without that answer.

Dependency vulnerability scanning (CI) and abnormal-auth-pattern alerting (401/403/429 spike detection) are both decision-free and could ship independently of the logging-vendor question - `npm audit`/`Dependabot`/`Renovate` for the former needs only a CI config choice (does this repo have CI at all yet? not confirmed - check before assuming GitHub Actions), and the latter is a query over `activity_logs` that already has all the data it needs.

Dashboard stat cache/precompute (deferred from Phase 3d) belongs here too - revisit once real usage volume makes the live-query approach actually slow (not measured to be a problem yet).

### Verification (4b-4f)

Not written yet - each sub-phase gets its own detailed Verification list (matching 4a's above) when it's fleshed out for real, per this repo's phase-planning convention.
