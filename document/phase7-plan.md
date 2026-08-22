# Phase 7 — Production Hardening & Remaining Feature Backlog

## Context

Phase 6 closed all outstanding technical debt (`document/00-progress.md`, 2026-08-22): dead code
removed, auth/ACL route-handler tests added, lint at 0 warnings with a `--max-warnings 0` CI
ratchet. `00-progress.md`'s "งานถัดไปที่ควรทำ" listed four options for what comes next; the user
picked **all of the remaining backlog**, split into small sub-phases, deferring only the
"confirm CI actually runs on GitHub" PR question and the i18n sweep (both explicitly parked,
not part of this phase).

That backlog, as tracked in `feature-list.md` and `phase6-plan.md`'s "Out of scope / backlog"
section, groups into five areas: a real job scheduler + structured logging, the list pages that
never got server-side pagination, dashboard stat caching + a monthly trend view, a storage-backend
abstraction + fuzzy search, and the never-built support-ticket system. Phase 7 is those five areas
as sub-phases **7a → 7e**, in that order — infra (7a) first so later sub-phases can lean on it,
list-UX bug fixes (7b) early since they're user-visible today, then dashboard/storage/search
(7c–7d, independent of each other), tickets last (7e, the largest net-new feature).

## Audit — measured, not assumed

A research pass across the live codebase (2026-08-22) grounds every sub-phase below in actual
file/line evidence rather than the one-line backlog descriptions in `feature-list.md`. The two
findings that change scope materially from what the backlog line items implied:

### New finding: `reports/categories` and `reports/tags` are non-functional stubs, not just missing pagination

`app/(auth)/reports/categories/page.tsx:30` and `app/(auth)/reports/tags/page.tsx` (equivalent)
pass a **hardcoded `data={[]}`** to their table component — there is no `fetch()` call anywhere
in either page or its component tree. Their create forms
(`catagoriesCreateForm.tsx:21-24`, `tagsCreateForm.tsx` equivalent) `console.log(params)` on
submit instead of calling an API — because **no such API exists**: `grep` across `app/api/**`
found no `categories` or `tags` CRUD route at all, only `app/api/baseconfig/selections/route.ts`
(a read-only dropdown-selection endpoint used elsewhere, not a management CRUD). The dialog's
`openDialog` state in `page.tsx:15` is also never updated (`const [openDialog] = useState(false)`
— setter discarded), consistent with `CLAUDE.md`'s note that `DrawerDialogDemo` ignores the
`isOpen` prop it's given.

This means these two pages — which `CLAUDE.md`'s "UI conventions" section explicitly calls out as
**"the reference implementation to copy when adding a new manageable list"** — have never worked,
through Phases 0–6, and nothing caught it because category/tag *data* is read successfully
elsewhere (`baseconfig/selections`) even though the *management* pages for creating/editing them
do nothing. This wasn't on any backlog list; it surfaces here because 7b's job is exactly "wire
list pages to real paginated fetches," which is the same work needed to fix this. Folded into 7b
below rather than treated as a separate emergency fix — it's been broken since before Phase 0 and
nothing depends on fixing it faster than the rest of 7b.

### New finding: the two job endpoints are HTTP+auth-gated, so an in-process scheduler can't call them as-is

`app/api/system/jobs/check-report-expiry/route.ts` and `.../check-storage/route.ts` are both
`POST` handlers behind `requireRole(req, routeAcceptted('admin'))`. A `node-cron` interval
running inside the same process has no request/cookie to authenticate with — it must call the
underlying business logic as a plain function, not go through the HTTP+auth layer. 7a extracts
that logic so both the admin-triggered HTTP path and the cron path share one implementation.

### Other grounding facts (used directly in the sub-phase designs below)

- **Logging**: `lib/logger.ts` (pino, Node-runtime-only, plain JSON — colorized `pino-pretty`
  crashed Windows dev per-route processes once already, per its own header comment) is called
  from exactly one place today (`lib/activity-log.ts:41`). `lib/log-dev-error.ts` (Phase 6c) is an
  explicitly-left seam ("wiring this to `lib/logger.ts` is a later decision," per its own comment)
  — 7a is that later decision. 86 raw `console.*` calls exist outside generated/`node_modules`;
  of those, 23 are in API route handlers, 9 in `lib/*`, 10 in one-shot `prisma/seed*.ts` CLI
  scripts (out of scope — not part of the running app), and 31+3 are in `'use client'` components
  (out of scope — pino is Node-only, can't run in the browser).
- **A real bug found in the same audit**: `app/api/baseconfig/permissions/route.ts:49` returns
  `NextResponse.json({error: console.error()}, {status: 400})` — `console.error()` evaluates to
  `undefined`, so the response body silently serializes as `{error: undefined}` instead of the
  actual error message. The identical pattern recurs at `app/api/users/roles/route.ts:65` and
  `app/api/users/user/route.ts:36`. Same class of bug as the ones already fixed in 5f/ของค้าง #2
  (a lint/cleanup pass surfacing a real swallowed-error bug) — fixed as part of 7a's sweep since
  it touches these exact lines anyway.
- **Pagination**: only 3 endpoints paginate server-side today (`reports/browse`,
  `activity-logs`, `reports/report/manage`, all via `lib/pagination.ts`'s `parsePagination`).
  Five more list-returning GET endpoints return full unpaginated arrays:
  `GET /api/reports/favorites`, `GET /api/users/departments`, `GET /api/users/user`,
  `GET /api/users/roles`, `GET /api/baseconfig/menus`. `SharedDataTable`
  (`components/shared/dataTable.tsx`) — the component `CLAUDE.md` names as the shared pattern —
  is actually used by only 2 pages (`role-management/roles`, `settings/menus`); every other list
  page hand-rolls its own `@tanstack/react-table` wiring. `components/shared/skeletonTable.tsx`
  exists and works but is wired into exactly one page (`role-management/roles`).
- **Dashboard**: all 4 `app/api/dashboard/*` endpoints are live-computed on every call, no
  caching. `trends/route.ts` groups by `date_trunc('day', ...)` only, no monthly option; its own
  comment ("`view_count` is never incremented anywhere") is stale — 4c added that increment,
  the comment was never updated. `lib/redis.ts` (a `globalThis`-cached `ioredis` singleton) and
  `lib/rate-limit.ts` (fail-open `try/catch` around every Redis call, since "rate limiting is
  defense-in-depth, not the primary auth boundary") are the pattern to copy for a cache.
- **Storage**: `lib/storage-path.ts` has 4 free functions (`getUploadRoot`, `getMaxUploadSize`,
  `resolveStoredFile`, `validateUploadBasePath`) and no interface/class boundary — 5 call sites
  total (3 download/preview routes, `settings/system` validation, `reportFileUploadServices.ts`'s
  write/delete). **Search fuzzy-tolerance infra already exists**: `reports.name_th`/`name_en`/
  `code` already have `gin_trgm_ops` GIN indexes (`schema.prisma:288-290`) that support Postgres's
  `pg_trgm` `similarity()`/`%` operators — today's query
  (`app/api/reports/browse/route.ts:49-72`) only uses plain `ILIKE '%term%'` substring matching
  against them, so adding real fuzzy tolerance is a query-shape change, not a new migration.
- **Support tickets**: `support_tickets` schema exists in full (id, ticket_number, user_id,
  subject, description, `category` as free `String`, `priority`/`status` enums, `assigned_to` as
  a bare `String?` with **no FK/relation** — the app must validate it itself — `resolved_at`,
  timestamps) with zero endpoints/UI. No ticket-related `NotificationType` values exist yet, no
  `'ticket'` `ActivityEntity` value, no Help/Support nav group (removed in 6a because every child
  404'd — this is a fresh addition, not a revival), and no support/moderator role — `routeAcceptted`
  only knows `admin`/`user`/`guest` tiers, so ticket management is necessarily admin-tier-gated.

## Resolved decisions (user, 2026-08-22)

1. **All five backlog areas are in scope**, split into sub-phases 7a–7e in the order above.
2. **7a's scheduler is in-process `node-cron`**, not GitHub Actions or an OS-level scheduler —
   chosen so it works identically in any deploy environment without extra infra or exposing the
   job endpoints publicly.
3. **No error-tracking vendor** (Sentry etc.) this phase — pino stays log-only, no external
   destination. Revisit only if a real incident makes the gap concrete (matching how 4f originally
   deferred it).
4. **Storage backend abstraction is interface-only**: local implementation is real (wraps today's
   `lib/storage-path.ts` behavior), S3/MinIO is a stub that throws "not implemented" — no MinIO/S3
   credentials or self-hosted instance exist to test against, so building a working second
   backend now would be unverifiable code. Same "aspirational vs. verified" line Phase 4c drew
   for AV scanning.
5. **The `reports/categories`/`reports/tags` stub-page bug (found during this audit, see above)
   is fixed inside 7b**, not spun out separately — it's the same "wire a list page to a real
   paginated endpoint" work 7b is already doing, just with CRUD endpoints that don't exist yet
   needing to be built first.
6. **Ticket management stays admin-tier** (`ADMIN`/`SUPER_ADMIN` via existing `routeAcceptted`)
   — no new "support agent" role, since none exists in the current role model and inventing one
   is a bigger decision than this phase's backlog line item implies.

---

## Sub-phase 7a — Job scheduler + structured logging

### 1. Extract job logic from the HTTP layer

`app/api/system/jobs/check-report-expiry/route.ts` and `.../check-storage/route.ts` currently do
`requireRole` → business logic inline. Extract the business logic into
`lib/jobs/checkReportExpiry.ts` and `lib/jobs/checkStorage.ts` (each exporting one async function,
same signature as today's inline logic, returning whatever shape the route currently responds
with). Each route handler becomes: `requireRole` check → call the extracted function → return its
result as JSON. Behavior for the existing admin-triggered HTTP path must be identical — this is a
refactor, not a behavior change.

### 2. `instrumentation.ts` (new, repo root)

Per `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md`:
a root `instrumentation.ts` exporting `register()` runs once per server instance, before it
accepts requests, in both Node and Edge compilation contexts — gate the cron registration behind
`if (process.env.NEXT_RUNTIME === 'nodejs')` (the same guard reason `lib/redis.ts` stays out of
Edge-bundled files like `lib/auth.ts`). Add a `globalThis`-flag guard (same HMR-safe idiom as
`lib/redis.ts`'s singleton) so a dev-mode reload can't double-register the interval.

### 3. `lib/jobs/scheduler.ts` (new)

Registers two `node-cron` schedules calling the two extracted functions directly (no HTTP, no
auth needed — this *is* the trusted in-process caller): `check-report-expiry` daily (e.g.
`0 2 * * *`), `check-storage` hourly (e.g. `0 * * * *`). Wrap each call in `try/catch` logging
failures via `lib/logger.ts` (a scheduled job failing must not crash the process). Add `node-cron`
to `package.json` dependencies.

### 4. Wire `lib/log-dev-error.ts` to pino

Resolve the seam left in 6c: in development, keep the existing `console.log(error)` behavior
unchanged; outside development, call `logger.error({ error }, ...)` instead of doing nothing (today
it is silent outside dev). No change to the function's call sites (still called the same way from
every route handler's catch block) — this is `logDevError`'s internal implementation only.

### 5. Replace remaining `console.*` with `logger.*`

Scope: the 23 API-route-handler call sites (11 files:
`app/api/auth/login/route.ts`, `.../verify-2fa/route.ts`, `.../logout/route.ts`,
`app/api/baseconfig/permissions/route.ts`, `app/api/baseconfig/route.ts`,
`app/api/baseconfig/selections/route.ts`, `app/api/reports/report/manage/route.ts`,
`app/api/users/roles/route.ts`, `app/api/users/user/route.ts`,
`app/api/users/user/update/route.ts`, `app/api/users/user/[id]/route.ts`) plus the 9 `lib/*` call
sites (`lib/fileUploadServices.ts` ×3, `lib/imageConvert.ts` ×1, `lib/notifications.ts` ×1,
`lib/rate-limit.ts` ×2, `lib/redis.ts` ×1, `lib/reportFileUploadServices.ts` ×2). Explicitly out of
scope: `'use client'` components (pino is Node-only — stated in `lib/logger.ts`'s own header
comment) and `prisma/seed*.ts` (one-shot CLI scripts, not the running app).

While touching these lines:
- Fix the 3 `console.error()`-as-value bugs (`baseconfig/permissions/route.ts:49`,
  `users/roles/route.ts:65`, `users/user/route.ts:36`) — each currently returns
  `{error: undefined}` to the client instead of the real error message.
- Delete the stray `console.log(originalName)` debug leftover in `lib/imageConvert.ts:179` (no
  error context, not something to route through pino).

### Verification (7a)

- Start `npm run dev`, confirm via a log line (or a temporary `console.log` in `register()`,
  removed after) that `instrumentation.ts` runs exactly once, not once per HMR reload.
- Manually shorten one cron expression to `*/1 * * * *` temporarily, confirm the job fires and its
  effect matches the existing manual-trigger behavior (e.g. an expiring test report gets
  `expiry_notified_at` set) — then revert the schedule.
- Confirm the admin-triggered HTTP endpoints (`POST /api/system/jobs/check-report-expiry` /
  `check-storage`) still behave identically via `curl` with an admin cookie — the extraction must
  not change their request/response shape.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings (unchanged from Phase 6's baseline);
  `npm test` → green; `npm run build` → exit 0 (dev server stopped).
- Spot-check 3-4 of the fixed error-response bugs with a deliberately bad request and confirm the
  JSON body now carries a real message, not `{error: undefined}` / `{}`.

---

## Sub-phase 7b — Server-side pagination, loading states, and the categories/tags fix

**Closed 2026-08-22 — with two deviations from this plan found necessary during implementation:**

1. **Pagination is opt-in, not unconditional**, on all 4 endpoints actually touched (see below —
   `baseconfig/menus` was dropped entirely, not just made opt-in). Live-reading
   `components/shared/reportPermissionsDrawer.tsx` while implementing found its own header comment
   already documenting that its user/role combobox has "no server-side search" and depends on the
   full list from `GET /api/users/user`/`GET /api/users/roles`. Unconditional `skip`/`take` would
   have silently truncated that combobox at the default page size (100) for any org with more
   users/roles than that — a permission-management regression worse than the unbounded-query risk
   being fixed. Resolution: `skip`/`take` only apply when the caller passes `?page`/`?pageSize`
   explicitly; every existing caller (which never does) keeps getting the full list, unchanged.
2. **`GET /api/users/roles`'s response shape stays a bare array when not paginated** - a second,
   independent consumer (`reportPermissionsDrawer.tsx`'s role combobox) does `Array.isArray(json)`
   directly on the response body. Wrapping the shape in `{success,data,meta}` unconditionally
   would have zeroed out that combobox's role list. It only switches to `{success,data,meta}` once
   a caller opts into paging - a deliberately asymmetric contract, not an oversight.
3. **`GET /api/baseconfig/menus` was not paginated at all**, contrary to this plan's original
   list of 5 endpoints - its own header comment states rows are deliberately sorted so a
   `group_label`/`catagory_label` group's rows sit adjacently ("reads as grouped" without a tree
   widget). A generic page boundary can split a group across two pages, which would break that
   documented invariant. Menus are also admin-authored master data (bounded by how many nav items
   exist), not user-generated content that grows unboundedly, so the risk the rest of this
   sub-phase is mitigating doesn't really apply here. Left unbounded by design.

### 1. Paginate the 4 full-array list endpoints (not 5 — see deviation above)

Add `parsePagination` (same helper `reports/browse` already uses), opt-in via
`?page`/`?pageSize`, to: `GET /api/reports/favorites`, `GET /api/users/departments`,
`GET /api/users/user`, `GET /api/users/roles`. Response shape matches the existing
paginated-endpoint convention (`{success,data,meta:{page,pageSize,total,totalPages}}`) once a
caller opts in; unpaginated calls get exactly what they got before (full list, and for
`GET /api/users/roles` specifically, the original bare-array body).

Two real bugs found and fixed while touching these exact handlers:
- `GET /api/users/user` had no `select` at all (`prisma.users.findMany({})`) - every response
  included the bcrypt `password` hash and `two_factor_secret`. Added an explicit `select` scoped
  to the fields the UI actually reads.
- `POST /api/users/departments` returned the bare created row with no `success` key, but
  `deptForm.tsx`'s submit handler only shows its toast/redirects on `data?.success` - department
  creation worked (row landed in the DB) but silently never gave the admin any feedback. Fixed to
  return `{success:true, data: department}` matching every other create endpoint's convention.

### 2. New: `categories`/`tags` CRUD, replacing the stub pages

- `app/api/reports/categories/route.ts` (new) — `GET` (admin-tier, matching every other
  master-data endpoint here — departments/roles/menus are all admin-only), `POST` (admin,
  `faker.string.uuid()` id per repo convention, fields per `categories` model: `name`, `code`
  unique, `description?`, `parent_id?`, `icon?`, `color?`, `sort_order`, `is_active`).
- `app/api/reports/categories/[id]/route.ts` (new) — `PUT`/`DELETE` (admin). `DELETE` is blocked
  with a 409 (not attempted) if any report or child category still references the row -
  `reports.category_id` is a required column with no `onDelete` rule, so letting the delete hit
  Postgres directly would surface a raw FK-violation 500 instead.
- `app/api/reports/tags/route.ts` + `[id]/route.ts` (new) — same shape for the `tags` model
  (`name`, `slug` unique, `description?`). `DELETE` has no such block - `tags -> report_tags` is
  `onDelete: Cascade`, so deleting a tag just un-tags whatever reports had it.
- Found two empty, git-untracked scaffold directories at these exact paths already
  (`app/api/reports/catagories/` - misspelled, and `app/api/reports/tag/` - singular), never
  populated by anyone. Removed and replaced with the correctly-named, real directories above.
- Built real controlled dialogs (`categoryFormDialog.tsx`/`deleteCategoryDialog.tsx`,
  `tagFormDialog.tsx`/`deleteTagDialog.tsx`) following `settings/menus`'s `MenuFormDialog`/
  `DeleteMenuDialog` pattern, replacing the two pages' `DrawerDialogDemo` usage entirely (it can't
  be seeded with data for edit) - deleted the old `catagoriesCreateForm.tsx`/`tagsCreateForm.tsx`
  stub forms (`console.log(params)` on submit, no fetch) along with them. Converted
  `catagoriesColumn.tsx`/`tagsColumn.tsx` into factory functions taking `onEdit`/`onDelete`
  callbacks (same shape as `reportColumn.tsx`), which is what makes the previously-no-op Edit/Delete
  dropdown items in both tables real. Found and fixed a second `create_at`/`created_at` typo in
  `catagoriesColumn.tsx` (a different occurrence from the one 6c already fixed in
  report-list/favorites).

### 3. Loading/skeleton states

Wire `components/shared/skeletonTable.tsx` into every list page touched by items 1–2 above (it
already works, just isn't used beyond `role-management/roles` today) — show it while the initial
fetch is in flight, same pattern as the one page that already does this correctly.

### Verification (7b)

- Each of the 4 paginated endpoints: `curl` with `?page=2&pageSize=2` and confirm `total`/`page`
  match real DB counts, not just page 1 repeated; then `curl` with no params and confirm the full
  list still comes back unchanged (the opt-in default). ✅ done live for all 4 (see 00-progress.md).
- `reports/categories`/`reports/tags`: create → appears in the list without a manual refresh →
  edit it → delete it, including the categories delete-blocked-when-in-use 409 path. This is the
  first time these flows have ever worked end-to-end. ✅ done live via curl with a real admin JWT
  (no browser tool available in this session — see 00-progress.md for the exact commands/results).
- Every touched list page shows a skeleton while loading (throttle network in devtools or add a
  temporary delay to confirm, then remove the delay) and the real data after.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green;
  `npm run build` → exit 0.

---

## Sub-phase 7c — Dashboard: monthly trend toggle + Redis cache

**Closed 2026-08-22.** Built as planned, plus fixing the identical stale "`view_count` is never
incremented" comment found in `top-reports/route.ts` too (not just `trends/route.ts` — same
Phase-4c-made-it-stale class of doc/code mismatch). The 4 endpoints' cache-aside logic shares one
new helper, `lib/cache.ts`'s `withCache()`, rather than repeating the try/catch boilerplate 4
times. Live-verified both the fail-open path (Redis genuinely down at session start - `ECONNREFUSED`
logged 10 times, every endpoint still returned 200 with correct live data) and the cache-hit path
for real (wrote a distinguishable sentinel value directly into the `dashboard:summary` Redis key,
called the endpoint, got the sentinel back - proof the code actually reads from cache rather than
always recomputing). See `00-progress.md`'s Phase 7 section for the full verification log.

### 1. Monthly grouping option

`GET /api/dashboard/trends?days=30&granularity=day|month` (new `granularity` param, default
`day` — unchanged default behavior). `month` groups by `date_trunc('month', created_at)` instead
of `'day'`, over a wider default window when `granularity=month` is selected (e.g. 12 months
instead of 30 days — decide the exact default while implementing, cap similarly to today's
`MAX_DAYS`). Fix the stale "`view_count` is never incremented" comment (line 11) while touching
this file — 4c added that increment.

### 2. Redis cache for all 4 dashboard endpoints

Follow `lib/rate-limit.ts`'s fail-open pattern exactly: `redis.get('dashboard:<endpoint>:<params-hash>')`
before computing, `redis.set(..., 'EX', <ttl>)` after (short TTL — e.g. 60s, since these are
admin-viewed stats, not real-time-critical), wrapped in `try/catch` that falls through to the live
query on any Redis error (same reasoning as rate-limiting: caching is a performance optimization,
not a correctness boundary — a Redis outage must not break the dashboard). Apply to `summary`,
`trends`, `top-reports`, `auth-alerts`.

### 3. UI: granularity toggle

`DashboardAnalytics.tsx` currently hardcodes `'/api/dashboard/trends?days=30'` with no control at
all. Add a simple day/month toggle (reuse existing `components/ui` primitives — a `Tabs` or
`ToggleGroup`, whichever the repo already has) that re-fetches with the new `granularity` param.

### Verification (7c)

- `curl` `trends?granularity=month` → response groups by month, day count sums match the
  underlying daily data for a spot-checked month.
- Confirm caching: call an endpoint twice within the TTL window, confirm the second call is faster
  and (temporarily log a marker in the query path) doesn't re-hit Postgres; call again after TTL
  expires, confirm it does.
- Kill the Redis container temporarily, confirm all 4 dashboard endpoints still return correct
  data (fail-open, not a 500) — then restart Redis.
- Toggle day/month in the actual dashboard UI in a browser, confirm the chart re-renders with the
  new granularity.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green;
  `npm run build` → exit 0.

---

## Sub-phase 7d — Storage backend abstraction + fuzzy search

**Closed 2026-08-22 — one deviation from this plan:** the interface ended up with 3 methods, not
4. Checking every real call site first (as the "Implement per plan" step requires) found that
`resolve` is never used independently — all 3 download/preview routes call
`resolveStoredFile()` immediately followed by `fs.readFile()`, never just the path alone. Rather
than expose a 4th method nothing calls on its own, the traversal-safety check is folded directly
into `local.ts`'s `write`/`read`/`delete` (still reusing `resolveStoredFile()` from
`lib/storage-path.ts` unchanged inside each). `app/api/settings/system/route.ts`'s
`validateUploadBasePath` call was also left untouched, not routed through the interface — it's a
local-filesystem-specific pre-flight check (does this directory exist and is it writable), not a
generic storage operation any backend would implement the same way.

### 1. Storage interface

`lib/storage/types.ts` defines `StorageBackend` with 3 methods: `write(relPath, buffer) → void`,
`read(relPath) → Buffer`, `delete(relPath) → void` (see the deviation note above for why not 4).
`lib/storage/local.ts` implements it by wrapping `lib/storage-path.ts`'s existing
`resolveStoredFile()` unchanged (no behavior change for the only backend actually used).
`lib/storage/s3.ts` (stub) implements the same interface with every method throwing
`Error('S3 storage backend not implemented')` — exists so the interface shape is proven out
without unverifiable code pretending to work. `lib/storage/index.ts` exports `storage =
localStorage` unconditionally (a config point for a future backend switch, not a working switch).
Updated 4 of the original 5 call sites (3 download/preview routes, `reportFileUploadServices.ts`'s
write/delete) to go through it; `settings/system`'s validation stayed on `storage-path.ts` directly
per the deviation above.

### 2. Fuzzy/typo-tolerant search

`app/api/reports/browse/route.ts`'s search query gains a `pg_trgm` `similarity()` term alongside
the existing `tsvector`/`ILIKE` conditions, using the GIN trigram indexes that already exist
(`reports_name_th_trgm_idx`, `reports_name_en_trgm_idx`, `reports_code_trgm_idx` —
`schema.prisma:288-290`, no new migration needed). Decide a similarity threshold (e.g.
`similarity(name_th, ${q}) > 0.3`) added as an `OR` branch to the existing `WHERE`, so exact/prefix
matches (already working) are unaffected and near-miss/typo queries additionally match. Ranking
by best-match turned out to need more than an `ORDER BY` on the existing raw query: Prisma's
`findMany` (used for the actual field selection, after the raw query narrows down matching ids)
has no way to sort by a computed SQL expression, and it doesn't preserve the order of a
`where: {id: {in: [...]}}` array either. The raw query now selects `id` + a computed `rank`
column, orders by rank, and pagination slices that already-ranked id list directly (not
Prisma's `skip`/`take`) — `findMany`'s results are then re-sorted in JS back into that same
order. Without this, page 2 of a search would return an arbitrary slice, not the next-best
matches.

### Verification (7d)

- Every existing upload/download/preview flow behaves identically after the interface swap —
  byte-identical file round-trip, same as 4c's original verification.
- Calling an S3 stub method directly (e.g. in a scratch script) throws the expected "not
  implemented" error rather than silently doing nothing.
- Search for a deliberately misspelled report name (1-2 character typo) and confirm it now
  surfaces the intended report where the old `ILIKE`-only query would have returned nothing —
  compare before/after on the same query string.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green;
  `npm run build` → exit 0.

---

## Sub-phase 7e — Support tickets: CRUD + UI

**Closed 2026-08-22 — Phase 7 fully closed, all 5 sub-phases.** Built as planned. One thing worth
flagging: unlike `ActivityEntity` (a plain TS union - `activity_logs.entity` is just a `String`
column), `NotificationType` is a real Postgres enum, so adding the 3 ticket notification types
needed an actual migration, not just an app-level type edit. Running it hit ของค้าง #1's known
`reports.search_vector` false-diff again (`ALTER TABLE "reports" ALTER COLUMN "search_vector" DROP
DEFAULT` in the generated `migration.sql`) - caught and stripped via `--create-only` first, per the
standing rule, then applied cleanly. `npx prisma migrate dev` hung the non-interactive shell after
a successful apply (same as Phase 4e's experience); confirmed via `prisma migrate status` (up to
date) and a direct `pg_enum` query (all 3 new values present) instead of waiting on it.

### 1. Schema additions (additive only)

- `NotificationType` (`schema.prisma:481-494`): add `TICKET_CREATED`, `TICKET_ASSIGNED`,
  `TICKET_STATUS_CHANGED` (exact names TBD at implementation time, additive like every prior
  phase's enum extension).
- `lib/activity-log.ts`'s `ActivityEntity` union: add `'ticket'`, same additive pattern as 4c's
  `'view'` and 4e's `'system'`.
- No schema migration needed for `support_tickets` itself — the model already exists in full.

### 2. Endpoints

- `app/api/tickets/route.ts` — `GET` (any authenticated user: own tickets only, unless
  admin-tier, which sees all — mirror the ACL-scoping pattern `reports/browse` already uses for
  "admin sees everything, user sees own/permitted"), `POST` (any authenticated user: create a
  ticket for themselves — `ticket_number` generated server-side, e.g. a zero-padded sequential or
  date-based scheme, decide at implementation time).
- `app/api/tickets/[id]/route.ts` — `GET` (owner or admin-tier), `PUT` (admin-tier only:
  `status`, `assigned_to`, `priority`; validate `assigned_to` against real user ids manually,
  since the schema has no FK for it), `DELETE` (admin-tier only, or omit delete entirely and rely
  on `status: CLOSED` — decide at implementation time; closing is safer than deleting a support
  record).
- On `status` transition to `RESOLVED`/`CLOSED` and on `assigned_to` change: `createNotification`
  to the ticket's `user_id` (and to `assigned_to` on assignment), following
  `check-report-expiry/route.ts`'s existing call pattern. Set `resolved_at` when transitioning to
  `RESOLVED`.
- `logActivity` calls on create/update, entity `'ticket'`.

### 3. UI

- User-facing: a "My Tickets" page (list own tickets + a create form: subject, description,
  category (free text per schema), priority).
- Admin-facing: a ticket queue page (list all, filter by status/priority, assign, change status)
  — admin-tier gated per decision 6 above (no new role).
- New nav entries in `lib/menu-list.ts` under a fresh "Help & Support" group (not reviving the
  one 6a removed — that one's children genuinely 404'd; this is a real, working page from day
  one) pointing at the two new pages above.

### Verification (7e)

- Create a ticket as a `USER`, confirm it's visible to that user and to an `ADMIN`, not visible to
  a different `USER`.
- Assign + resolve a ticket as admin, confirm the requester gets a notification
  (`GET /api/notifications` shows it) and `resolved_at` is set in the DB.
- Attempt `PUT`/`DELETE` as a non-admin `USER` on someone else's ticket → 403/404 per the same
  "don't confirm existence to unauthorized users" convention used elsewhere in this codebase.
- New nav entries render and navigate correctly; run the `lib/menu-list.test.ts` guard added in
  6a (asserts every leaf href has a real page) — it should pass without modification if the new
  pages exist at the hrefs used.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green;
  `npm run build` → exit 0.

---

## Out of scope / backlog after Phase 7

i18n (`next-intl`) as its own phase (unchanged, explicitly parked this session); confirming
`.github/workflows/ci.yml` runs green on GitHub (parked this session — PR not yet opened);
ของค้าง #9 (`deepmerge-ts` via `@prisma/config`, no fix available upstream yet); email delivery
for high-severity notifications (still not requested as part of this phase's ops work — the
scheduler moves check-expiry/check-storage from manual to automatic, but their notifications stay
in-app only); AV scanning of uploads (still no ClamAV daemon confirmed in any deploy environment);
a real S3/MinIO backend (7d builds the seam, not a tested second implementation — needs real
infra to ever go from stub to real); dropping the dead `report_versions` table (ของค้าง #3, still
awaiting sign-off); sidebar navigation becoming DB-driven (the two parallel menu sources noted in
`CLAUDE.md` stay parallel).
