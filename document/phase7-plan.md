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

### 1. Paginate the 5 full-array list endpoints

Add `parsePagination` (same helper `reports/browse` already uses) to:
`GET /api/reports/favorites`, `GET /api/users/departments`, `GET /api/users/user`,
`GET /api/users/roles`, `GET /api/baseconfig/menus`. Response shape matches the existing
paginated-endpoint convention (`{data, total, page, pageSize}` or whatever `reports/browse`
already returns — reuse exactly, don't invent a second shape).

### 2. New: `categories`/`tags` CRUD, replacing the stub pages

- `app/api/reports/categories/route.ts` (new) — `GET` (paginated, admin+user readable per
  existing read-tier convention elsewhere), `POST` (admin, `faker.string.uuid()` id per repo
  convention, fields per `categories` model: `name`, `code` unique, `description?`, `parent_id?`,
  `icon?`, `color?`, `sort_order`, `is_active`).
- `app/api/reports/categories/[id]/route.ts` (new) — `PUT`/`DELETE` (admin).
- `app/api/reports/tags/route.ts` + `[id]/route.ts` (new) — same shape for the `tags` model
  (`name`, `slug` unique, `description?`).
- Wire `catagoriesTable.tsx`/`tagsTable.tsx` to actually `fetch()` these new endpoints
  (page + pageSize state, same pattern as `reports/report-list`), fix `catagoriesCreateForm.tsx`/
  `tagsCreateForm.tsx` to `POST`/`PUT` instead of `console.log(params)`, and fix
  `reports/categories/page.tsx`'s `openDialog` state (currently `const [openDialog] = useState(false)`
  with the setter discarded — the dialog never actually opens/closes based on real state).

### 3. Loading/skeleton states

Wire `components/shared/skeletonTable.tsx` into every list page touched by items 1–2 above (it
already works, just isn't used beyond `role-management/roles` today) — show it while the initial
fetch is in flight, same pattern as the one page that already does this correctly.

### Verification (7b)

- Each of the 5 paginated endpoints: `curl` with `?page=2&pageSize=10` (or whatever param names
  `parsePagination` expects) and confirm `total`/`page` match real DB counts, not just page 1
  repeated.
- `reports/categories`: create a category through the UI → appears in the list without a manual
  refresh → edit it → delete it. Same for `reports/tags`. This is the first time these flows have
  ever worked end-to-end — verify by hand, not by reading the code.
- Every touched list page shows a skeleton while loading (throttle network in devtools or add a
  temporary delay to confirm, then remove the delay) and the real data after.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green;
  `npm run build` → exit 0.

---

## Sub-phase 7c — Dashboard: monthly trend toggle + Redis cache

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

### 1. Storage interface

New `lib/storage/index.ts` (or similar) defining a small interface covering exactly the 4
operations today's call sites need: `write(relPath, buffer) → void`, `read(relPath) → Buffer`,
`delete(relPath) → void`, `resolve(relPath) → absolute path` (the traversal-safe check
`resolveStoredFile` already does). `lib/storage/local.ts` implements it by wrapping today's
`lib/storage-path.ts` functions unchanged (no behavior change for the only backend actually used).
`lib/storage/s3.ts` (stub) implements the same interface with every method throwing
`Error('S3 storage backend not implemented')` — exists so the interface shape is proven out
without unverifiable code pretending to work. Update the 5 call sites
(3 download/preview routes, `reportFileUploadServices.ts`'s write/delete, `settings/system`'s
validation) to go through the interface, selecting the local implementation unconditionally for
now (a config point for a future backend switch, not a working switch).

### 2. Fuzzy/typo-tolerant search

`app/api/reports/browse/route.ts`'s search query gains a `pg_trgm` `similarity()` term alongside
the existing `tsvector`/`ILIKE` conditions, using the GIN trigram indexes that already exist
(`reports_name_th_trgm_idx`, `reports_name_en_trgm_idx`, `reports_code_trgm_idx` —
`schema.prisma:288-290`, no new migration needed). Decide a similarity threshold (e.g.
`similarity(name_th, ${q}) > 0.3`) added as an `OR` branch to the existing `WHERE`, so exact/prefix
matches (already working) are unaffected and near-miss/typo queries additionally match. Order
results by best-match rank when a search term is present (today's query has no explicit
relevance ordering).

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
