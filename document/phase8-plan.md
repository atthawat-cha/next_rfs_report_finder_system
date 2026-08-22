# Phase 8 — Proxy Migration, Share Cleanup, Validation Audit, List Consistency

## Context

Phase 7 closed the entire backlog it set out to (job scheduler, pagination, dashboard cache,
storage abstraction, support tickets) — see `document/00-progress.md`. There was no pre-agreed
plan for what comes after, so this phase's scope was chosen live with the user from the real
remaining `feature-list.md` backlog, filtered to items doable without external infra/credentials
(email delivery, a real S3/MinIO backend, and an error-tracking vendor all stayed out of scope for
that reason). Four items were selected:

1. Migrate `middleware.ts` → `proxy.ts` (Next.js 16 deprecated `middleware`, renamed to `proxy`).
2. Close the gap where nothing actually deletes/deactivates an already-expired `report_shares` row.
3. Audit every API route handler for `zod` validation on its request body.
4. Finish server-side pagination + loading-state consistency on the list pages Phase 7b didn't
   reach.

## Audit — measured, not assumed

A research pass (2026-08-22) across the live codebase grounds each sub-phase below. The single
most consequential finding changes 8a's risk profile from "mechanical rename" to "real runtime
change":

### 8a is not a rename — it's a runtime change

A live check (add a temporary log line to `middleware.ts`, hit a protected route, read the dev
server output) confirmed `middleware.ts` currently runs on the **Edge** runtime today
(`typeof EdgeRuntime === 'string'`, no `process.version` available). Next.js 16's `proxy.js` docs
state Proxy **defaults to the Node.js runtime**, and — critically — **the `runtime` config option
is not available in Proxy files; setting it throws**. There is no way to keep this code on Edge
once it's renamed to `proxy.ts`. This was surfaced to the user before finalizing this plan; they
confirmed proceeding, with the explicit instruction to treat it with the same rigor as any other
auth/session change (`CLAUDE.md`'s standing "extra care" list already names `middleware.ts`
alongside `lib/auth.ts` for exactly this reason).

Three files carry comments whose justification depends on the *old* runtime and will be factually
wrong the moment the rename lands:
- `lib/rate-limit.ts:7` — `// Kept out of lib/auth.ts on purpose: middleware.ts (Edge runtime) imports`
- `lib/logger.ts:19-20` — `Node-runtime only - do NOT import this from middleware.ts or anything it pulls in (lib/auth.ts). middleware.ts runs on the Edge runtime, which...`
- `lib/log-dev-error.ts:9` — references `middleware.ts` as the thing that has to "stay off pino"

`CLAUDE.md` names `middleware.ts`/`middleware()` at lines 52, 56, and 123 (routing structure, auth
model, and the Definition-of-Done "extra care" list respectively) — all need the rename reflected.
`next.config.js` has no reference to "middleware" by name (nothing to change there). No test file
imports or exercises `middleware.ts` directly. `package.json` confirms `next@16.3.1`, the version
that introduced the change.

**Resolved decision**: this phase does the rename, fixes every reference above, and corrects the
three stale comments to state the new (Node) runtime accurately — but does **not** additionally
move `lib/rate-limit.ts`/pino usage into `proxy.ts` itself. That the gate *could* now use ioredis
directly is a real, newly-available option worth recording, not a scope expansion to act on in the
same phase that's supposed to be a careful, narrow migration.

### 8b: no soft-delete field exists — cleanup means a real DELETE

`report_shares` (`schema.prisma:199-213`) has `expires_at`/`expiry_notified_at` but no
`is_active`/`revoked` column, and nothing else in the schema has a foreign key pointing *at* a
`report_shares` row. Hard-deleting expired rows is schema-safe. Two real behavior changes follow
from actually doing it, both acceptable and worth recording rather than silently discovering later:
- `GET /api/reports/[id]/shares` (`route.ts:24-27`) lists every share for a report with no filter
  excluding expired ones today — it doubles as an implicit history. Once this job runs, expired
  shares disappear from that list automatically instead of lingering until an admin manually
  deletes them.
- `GET /api/shares/[token]/route.ts:15-23` currently returns `410 Gone` for an expired-but-present
  token, and `404 Not Found` if the row doesn't exist at all. Once cleanup has run, an old expired
  link starts returning `404` instead of `410` — same deny outcome, different status code. This is
  arguably *more* correct (nothing is being confirmed to have existed), not a regression.

### 8c: the audit came back clean

Cross-referencing three independent signals — which `app/api/**/route.ts` files read a request
body (`req.json()`/`req.formData()`), which import `zod`, and which call `.safeParse()`/`.parse()`
— produced **the exact same 28 files** for all three lists, with no file in one list missing from
another. 8 of the 28 were read in full and every one validates before using any field. The
remaining 29 route files take no body (pure `GET`s on path/query params, or job-trigger endpoints)
and are correctly excluded. **This sub-phase closes as verification, not remediation** — a full
line-by-line pass of the other 20 files happens during implementation to make that certain rather
than trusting the cross-reference alone, but no code changes are expected unless that pass finds an
exception.

### 8d: exactly two real gaps, not a broad sweep

A full inventory of every table-rendering page found Phase 7b already covers `favorites`,
`departments`, `user-list`, `categories`, `tags` (skeleton + opt-in pagination), and confirmed
`role-management/roles` (skeleton, bounded dataset), `settings/menus` (spinner, deliberately
unpaginated per 7d), and the dashboard's capped lists are not real gaps — their absence of a
skeleton isn't a functional problem given how small/bounded those datasets are by design. Two
pages are real, concrete gaps:
- **`reports/report-list`** — the main report-finder page. No skeleton, no spinner, no loading
  text at all, and although it fetches `/api/reports/browse` (which already supports
  `page`/`pageSize` server-side, per Phase 7a/7d), it never sends them and has no pager UI — a
  user can only ever see the first page's worth of results.
- **`user-management/activity`** — already has full server-side pagination with real prev/next
  controls (`page.tsx:64-89, 215-227`), just no skeleton/spinner while the initial page loads
  (only an inline "กำลังโหลด..." text row inside the table body).

## Resolved decisions (user, 2026-08-22)

1. All 4 items in scope, in this order: 8a (isolated, highest care) → 8b (small, additive) → 8c
   (verification, low risk) → 8d (UI work, most files touched).
2. 8a proceeds despite the runtime-change discovery, with explicit extra rigor: full live
   re-verification of the auth gate (login redirect, protected-path redirect, `/shares/` bypass,
   matcher exclusions), not just confirming the app still boots.
3. 8a does not move rate-limiting/logging into the gate itself — noted as a now-available option,
   not executed here.
4. 8b hard-deletes; no schema change to add a soft-delete flag (out of scope, not requested).
5. 8c is scoped to confirm-and-close given the clean audit result; only becomes a fix task if the
   full-file pass during implementation turns up a real exception the sampling missed.
6. 8d is scoped to exactly the two pages found, not a repo-wide pagination-everywhere push —
   everything else already has pagination/skeleton or is bounded-by-design and doesn't need it.

---

## Sub-phase 8a — Migrate `middleware.ts` → `proxy.ts`

**Closed 2026-08-22.** Built exactly as planned, with the full extra-rigor verification the runtime
discovery called for. The codemod produced a clean rename (no stray `runtime` export, `config`/
`matcher` byte-identical). All 3 stale runtime-justification comments and CLAUDE.md's 3 references
were corrected, plus 2 more found during implementation that weren't in the original audit
(`proxy.ts`'s own Thai comment mentioning "middleware", and `lib/auth.ts:127`'s generic docstring
mention) — same class of finding, fixed the same way. The Node-runtime change was confirmed twice:
once during the pre-plan audit (temporary `EdgeRuntime`/`process.version` log, Edge confirmed), and
again after the migration (same technique, Node confirmed: `process.version` returned a real
version string, `EdgeRuntime` was `undefined`). See `00-progress.md`'s Phase 8 section for the full
live-verification log (every auth-gate path exercised, not just a build check).

### 1. The migration itself

Run `npx @next/codemod@canary middleware-to-proxy .` (renames the file and the exported function
from `middleware` to `proxy`; `export const config` / `matcher` stay as-is per the docs). Confirm
the resulting `proxy.ts` has no `export const runtime` (would throw if present) and behaves
identically otherwise — same `publicPaths`, same `/shares/` bypass, same redirect logic.

### 2. Fix references

- `CLAUDE.md` lines 52, 56, 123 — `middleware.ts`/`middleware()` → `proxy.ts`/`proxy()`, keeping
  the actual described behavior (matcher, `publicPaths`, no `auth_token` cookie) unchanged.
- `lib/rate-limit.ts:7`, `lib/logger.ts:19-20`, `lib/log-dev-error.ts:9` — correct the runtime
  claim from Edge to Node, and rephrase the "kept out of lib/auth.ts" reasoning: it's no longer a
  hard technical constraint (ioredis/pino *could* now run in the gate), but `lib/auth.ts` is still
  imported by other Node-runtime call sites that don't need those dependencies, so the separation
  stays as a deliberate choice, not an enforced one. Record that node-cron's `lib/jobs/scheduler.ts`
  is unaffected either way (it never ran in `middleware.ts`).
- `document/00-progress.md` and any phase-plan doc describing the historical Edge-runtime reasoning
  gets a short correction note appended (not rewritten in place), per this project's established
  convention for stale-but-historical documentation.

### Verification (8a)

Full live re-verification, not just "the build still passes" — this is the same class of change
CLAUDE.md's "extra care" list exists for:
- Unauthenticated request to a protected path → redirect to `/login?redirect=<path>`.
- Authenticated request to `/login` → redirect to `/dashboard`.
- `/shares/[token]` reachable with no session (bypass still works).
- `/` and `/login` themselves still reachable with no session.
- `/api/*`, `_next/static`, `_next/image`, `favicon.ico` still excluded per the matcher (proxy
  never runs on them - confirm via a log line temporarily, same technique as the runtime check).
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green (32/32, no
  regressions in the ACL suite which exercises route handlers, not the gate itself, but should
  stay green); `npm run build` → exit 0.
- Confirm via the same `EdgeRuntime`/`process.version` live check used to discover the issue that
  `proxy.ts` now actually runs on Node (closing the loop on the finding, not just trusting the docs).

---

## Sub-phase 8b — Expired share-link cleanup job

**Closed 2026-08-22.** Built exactly as planned - no deviations. Live-verified both documented
behavior changes for real: created one already-expired and one still-live test share, confirmed
the pre-cleanup 410-vs-200 split, ran the job, and confirmed the expired token flipped to 404 (row
physically gone) while the live one stayed untouched at 200, and the admin share list stopped
listing the deleted row. Skipped re-running Phase 7a's standalone cron-fire proof since the
scheduler mechanism itself didn't change - only the business-logic function being registered is
new, and that was verified directly via the HTTP endpoint instead.

### 1. `lib/jobs/checkExpiredShares.ts` (new)

Mirrors `checkReportExpiry.ts`'s shape exactly: `runCheckExpiredShares(req, triggeredByUserId)`
deletes `report_shares` where `expires_at IS NOT NULL AND expires_at < now()`, logs the count via
`logActivity` (`entity: 'system'`, matching `check-report-expiry`/`check-storage`'s convention),
returns `{ deleted: count }`.

### 2. `app/api/system/jobs/check-expired-shares/route.ts` (new)

Thin `POST` wrapper: `requireRole('admin')` → call the extracted function → return JSON. Same
shape as `check-report-expiry`/`check-storage`'s route files.

### 3. `lib/jobs/scheduler.ts`

Register a third `cron.schedule(...)` call for this job (e.g. daily, alongside
`check-report-expiry`), same try/catch + `logger.info`/`logger.error` pattern as the existing two.

### Verification (8b)

- Create a `VITEST-8B-`-prefixed test share with `expires_at` in the past, run the job (via the
  admin HTTP endpoint first, matching how 7a verified check-report-expiry/check-storage), confirm
  the row is gone from the DB and `GET /api/reports/[id]/shares` no longer lists it.
- Confirm a *live* (non-expired) share survives the same run.
- Confirm `GET /api/shares/[token]` for the now-deleted token returns `404`, matching the
  documented behavior-change note above.
- Same standalone-script cron-fire proof Phase 7a used (temporarily run the scheduler's registration
  with a short interval, confirm it fires and calls the function) — or reuse that verification's
  evidence if the mechanism is unchanged (it is; only a new job is being added to the same proven
  scheduler).
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green; `npm run build` →
  exit 0.
- Update `feature-list.md` row 111 to ✅.

---

## Sub-phase 8c — Zod validation audit (confirm-and-close)

**Closed 2026-08-22 — confirm-only, exactly as anticipated.** Most of the 28 files were already
read in full across this session's own work on Phases 7-8 (categories/tags/tickets/departments/
roles/menus/settings/auth, etc.) or by the planning audit fork; only 4 remained genuinely unread:
`reports/report/manage/[id]/route.ts`, `reports/[id]/variables/route.ts`,
`reports/[id]/shares/route.ts`, `reports/[id]/queries/route.ts`. All 4 validate correctly (the
`shares` route even goes further, validating that a `USER`/`DEPARTMENT` share target actually
exists before creating the row). No code changes were needed - `feature-list.md`'s row was updated
to a clean ✅, dropping the long-standing "ตรวจให้ครบทุก endpoint ใหม่" hedge.

### 1. Full-file pass

Read the remaining ~20 of the 28 body-consuming route files not already spot-checked, confirming
each validates its parsed body via `zod` before use. Any exception found gets fixed the same way
the sampled files already do it (a `safeParse` + 400 response on failure), not a new pattern.

### Verification (8c)

- Every one of the 28 files confirmed (or fixed) to validate before use.
- If any fix was needed: `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` →
  green; `npm run build` → exit 0; live-curl the specific fixed endpoint with a malformed body,
  confirm a 400 with a real validation message instead of whatever it did before.
- Update `feature-list.md` row 188 to a clean ✅ (dropping the "⚠️ ตรวจให้ครบทุก endpoint ใหม่"
  hedge) if the pass confirms no exceptions.

---

## Sub-phase 8d — Pagination/skeleton for `report-list` and `activity`

**Closed 2026-08-22 — Phase 8 fully closed, all 4 sub-phases.** Built as planned, reusing
`user-management/activity/page.tsx`'s prev/next pager pattern for `report-list` exactly as
anticipated. Verified the underlying `/api/reports/browse?page=&pageSize=` mechanism returns
genuinely distinct pages (confirmed with `pageSize=1` against the dev DB's 3 real reports, since
the default `PAGE_SIZE=20` means the pager UI itself won't visibly appear until the DB has more
than 20 reports) - the wiring is correct even though this dev environment can't show the pager
rendering live. No browser tool available to confirm the skeleton/pager render visually, same
limitation noted throughout every phase in this session.

### 1. `app/(auth)/reports/report-list/page.tsx`

Add a `SkeletonTable` loading state (matching the Phase 7b convention already used on 5 other
pages) for the initial fetch. Add real pagination: `page`/`pageSize` state, send them to
`/api/reports/browse`, add prev/next controls (or reuse whatever pattern
`user-management/activity/page.tsx` already uses for its pager, since that's the one other real
precedent for pager UI in this app) driven by the endpoint's existing `meta.total`/`meta.totalPages`.

### 2. `app/(auth)/user-management/activity/page.tsx`

Add a `SkeletonTable` (or the same loading treatment used elsewhere) for the initial fetch,
replacing the inline "กำลังโหลด..." text row. Pagination itself needs no changes — it already works.

### Verification (8d)

- `reports/report-list`: confirm skeleton shows while loading, then real data; confirm page 2 via
  the new pager controls returns different reports than page 1, with `meta.total` matching the DB
  count (same proof style as Phase 7d's search-pagination verification).
- `user-management/activity`: confirm skeleton shows while loading; confirm existing pagination
  still works unchanged (prev/next, filters).
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green (including
  `lib/menu-list.test.ts`, unaffected but part of the standard gate); `npm run build` → exit 0.
- Update `feature-list.md` row 177 (data table pagination) to reflect both pages now covered.

---

## Out of scope / backlog after Phase 8

Email delivery for high-severity notifications, a real S3/MinIO backend (interface exists since
7d, no credentials to test against), an error-tracking vendor (Sentry etc.) to receive pino's
output, i18n (`next-intl`) as its own phase, ของค้าง #9 (`deepmerge-ts`/Prisma, no upstream fix
yet), ของค้าง #3 (dropping the dead `report_versions` table, still awaiting sign-off), moving
rate-limiting/logging into `proxy.ts` now that it runs on Node (newly possible per 8a's finding,
not executed), and confirming CI runs green on GitHub (still needs a PR opened from a branch to
`main` — not yet done).
