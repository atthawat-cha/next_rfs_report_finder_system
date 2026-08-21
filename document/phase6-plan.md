# Phase 6 — Technical Debt Cleanup

## Context

Phase 0–5f shipped and verified (`document/00-progress.md`). Phase 5 closed the last of the
`diff_req.md` requirements, so there is no outstanding *feature* requirement driving the next
phase — the user picked technical debt over production-readiness and over the remaining
feature backlog (i18n, job scheduler, email, S3 backend, support tickets, fuzzy search).

Two things happened while starting this session that make the debt concrete rather than
theoretical:

1. **The dev environment could not run the project at all.** `node_modules` was missing every
   devDependency (`vitest` absent → `npm test` failed with "'vitest' is not recognized"), the
   generated Prisma client in `app/generated/prisma/` was stale enough that `npx tsc --noEmit`
   reported 93 errors (`ReportOutputType` missing, `prisma.report_files` missing) until
   `npx prisma generate` was re-run, `.env`/`.env.local` pointed at `next_rfs_master@5434` —
   the pre-Phase-2 DB with 20 tables and no `_prisma_migrations` — and `docker` was not on
   PATH at all, so `docker compose up -d` (Redis) could not run either. None of this is
   recorded in any setup doc; all of it was rediscovered by trial and error.
2. **A real access-control bug (ของค้าง #13) had no test that could have caught it.** The whole
   role-tier layer had zero test coverage; the bug was found by hand during 5a's live checks
   and lived from 4c until it was fixed on 2026-08-20.

## Audit — measured, not assumed

### Lint: 222 warnings, 0 errors (`npx eslint .`, 2026-08-21)

| Rule | Count | Nature |
|---|---|---|
| `@typescript-eslint/no-unused-vars` | 128 | genuinely unused imports/vars/params, spread over most of the tree |
| `@typescript-eslint/no-unused-expressions` | 62 | **60 of them are one idiom**: `process.env.NODE_ENV === 'development' && console.log(error)` in 38 files (every route handler's catch block). The other 2 get looked at individually. |
| `react-hooks/set-state-in-effect` | 23 | the fetch-in-effect → `setState` pattern used by every list/detail page |
| `react-hooks/incompatible-library` | 7 | inspect individually |
| `react-hooks/exhaustive-deps` | 2 | inspect individually |

Worst files: `components/shared/dialog-drawer.tsx` (16), `prisma/seeds/init.seed.ts` (14),
`prisma/seeds/menus.seed.ts` (9), `lib/auth.ts` (8), `app/api/reports/report/manage/route.ts` (7),
`prisma/seed.ts` (7), `app/(auth)/reports/report-create/page.tsx` (6).

### Dead code — with importer evidence, not assumption

| File | Lines | Referenced by |
|---|---|---|
| `app/(auth)/reports/report-create/page copy.tsx` | 236 | nothing (not a route — Next.js ignores `page copy.tsx`; it is a scratch copy, owns 4 lint warnings) |
| `lib/security_get.ts` | 0 | nothing |
| `lib/security_post.ts` | 0 | nothing |
| `components/shared/right-drawer.tsx` | 49 | nothing (only mentioned in `reportPermissionsDrawer.tsx`'s comment explaining why it was *not* used) |
| `app/(auth)/role-management/manage/page.tsx` | 9 | nothing — stub, not linked from `lib/menu-list.ts` |
| `components/shared/dialog-drawer.tsx` | 65 | **3 real pages**: `reports/categories`, `reports/tags`, `user-management/user-department` |

> **Correction to an assumption made while scoping this phase**: `dialog-drawer.tsx` was
> initially grouped with the deletable scaffolds because 5d found it unusable. 5d's finding was
> narrower than that — it was unusable *as the reference to copy for a new dialog* (it ignores
> the props a real form dialog needs), which is why `settings/menus` wrote its own. The three
> pages above still import and render it today. It stays.

### Sidebar: 14 links that 404 when clicked

`lib/menu-list.ts` leaf entries (items rendered as `<Link>` — a parent with `submenus.length > 0`
renders a collapsible, not a link, so `/reports`, `/user-management`, `/security/auth`,
`/notifications` are *not* dead) with no `app/(auth)/<href>/page.tsx`:

`/data/export`, `/data/import`, `/data/backup`, `/help/documentation`, `/help/faq`,
`/help/release-notes`, `/help/support`, `/help/tutorial`, `/notifications/history`,
`/notifications/settings`, `/security/login-history`, `/security/session`, `/settings/api`,
`/settings/theme`.

> Note: `/settings/storage` **does** exist (5e) — the claim in `phase5-plan.md`'s audit that
> `menu-list.ts` "links to three pages that do not exist: `/settings/storage`, `/settings/api`,
> `/settings/theme`" is now only true for the last two.

### Documentation that contradicts the code

- `CLAUDE.md` "Routing structure": *"`middleware.ts` currently lists `protectedPaths` as
  `['/(auth)/dashboard', '/(auth)/profile']`"* — `protectedPaths` does not exist in
  `middleware.ts` any more (Phase 0 removed it, `5e799c1`).
- `CLAUDE.md` "Auth model": *"`middleware.ts` reads a cookie named `auth_token` when logging"* —
  there is no `auth_token` and no such logging in `middleware.ts` today.
- `CLAUDE.md` "Routing structure": *"`app/generated/prisma/` — generated Prisma client, checked
  in generated code"* — it is in `.gitignore` (line 38) and `git ls-files` returns 0 files for
  it. This exact wrong claim is what let a stale client sit in the tree and produce 93 phantom
  type errors at the start of this session.
- `CLAUDE.md` "Miscellaneous" describes `lib/security_get.ts`/`security_post.ts` and
  `page copy.tsx`, all of which 6a deletes — those lines have to go with them.
- `README.md` / `SETUP.md` still describe an auth starter scaffold (`CLAUDE.md` already says to
  treat them as stale — the fix is to make them true, not to keep the warning).
- `document/feature-list.md`'s CI row still blames `next@14.2.18`/`postcss`/`sharp` for the
  non-blocking `npm audit` step; those were all upgraded in `dependency-upgrade-plan.md`, and
  the only remaining reason is ของค้าง #9 (`deepmerge-ts`), as `ci.yml`'s own comment already
  says correctly.

### Test coverage

Three test files: `lib/sql-highlight.test.ts` (8 pure tests), `lib/report-acl.test.ts`
(7 integration tests against the real DB), `lib/auth.test.ts` (6 pure tests, added 2026-08-20
with the ของค้าง #13 fix). No route handler is exercised by any test — the role-tier gate, the
`isAdmin` ACL bypass inside each handler, and the 401/403/404 shape of every endpoint are all
untested. `prisma/seed-ci.ts` only creates the role `USER`, so a role-matrix test cannot run in
CI as-is.

## Resolved decisions (user, 2026-08-21)

1. **Phase 6 = technical debt**, chosen over production-readiness (deploy story, job scheduler,
   email, monitoring) and over the remaining user-facing features.
2. **Three sub-phases in this order: 6a → 6b → 6c.** Tests come *before* the lint sweep on
   purpose: 6c edits ~38 route handlers, and 6b is the net that proves those edits changed
   nothing. Doing 6c first was offered and declined.
3. **In scope**: dead code + doc truth-up (6a), auth/ACL route-handler tests (6b), lint sweep to
   **0 warnings** with the CI ratchet lowered to `--max-warnings 0` (6c). "0" is reachable
   because decision 6 below accounts for the 23 `set-state-in-effect` warnings with a scoped
   override rather than by rewriting the pattern; the other 199 get fixed for real.
4. **Out of scope, explicitly declined**: dropping the dead `report_versions` table (offered,
   not selected — it stays as ของค้าง #3 with the same standing sign-off requirement).
5. **Auth/ACL tests call the real route handlers against the real DB** — the repo's existing
   pattern (`lib/report-acl.test.ts`) and one CI already provisions Postgres + `seed-ci.ts` for.
   Mock-prisma and hybrid variants were offered and declined: mocking would have re-encoded the
   assumptions being tested, and `visibleReportIdsFor` is raw SQL that a mock cannot exercise.
6. **The two repo-wide lint patterns are handled asymmetrically**: a central `logDevError()`
   helper replaces the 60-occurrence log idiom (route handlers only — narrow ripple, covered by
   6b's tests, and the seam for wiring pino later), while `react-hooks/set-state-in-effect` gets
   a *scoped* ESLint override with a written justification instead of a repo-wide
   `useAsyncData()` hook refactor. Rationale: the hook version is better code but rewrites the
   data loading of ~15 UI pages, each needing its own live check, which is a bigger and riskier
   change than the warning it silences. Turning the rule off globally was also declined.
7. **Dead sidebar links get removed, not built.** Building `/data/*`, `/help/*`,
   `/notifications/*`, `/security/*`, `/settings/api`, `/settings/theme` is feature work for a
   later phase; a menu that 404s is the debt.
8. **`dialog-drawer.tsx` stays** (see the correction above) — its 16 warnings are fixed in 6c
   like any other file's. Migrating its three consumers to the `settings/menus` dialog pattern
   is not in scope.

---

## Sub-phase 6a — Dead code removal + documentation truth-up

No behaviour change anywhere. Every item is either a deletion of something nothing references,
or a documentation edit.

### 1. Delete

- `app/(auth)/reports/report-create/page copy.tsx`
- `lib/security_get.ts`, `lib/security_post.ts`
- `components/shared/right-drawer.tsx`
- `app/(auth)/role-management/manage/page.tsx` (and its now-empty directory)

Before each deletion: `grep -rn "<basename>" --include="*.ts" --include="*.tsx"` excluding
`node_modules`, and confirm the only hits are comments *about* the file. `right-drawer.tsx` is
referenced by name in `components/shared/reportPermissionsDrawer.tsx`'s header comment —
reword that comment rather than leaving a reference to a deleted file.

### 2. Sidebar dead links + a guard against them coming back

- Remove the 14 dead leaf entries listed in the audit from `lib/menu-list.ts`. Where removing a
  group's last leaf empties the group (`Data Management`, `Help & Support`), remove the group
  too. Where a parent keeps at least one live child, keep the parent.
- New `lib/menu-list.test.ts` — a pure test (no DB) that walks `getMenuList('/')`, collects
  every leaf `href` (items with no submenus, plus every submenu entry), and asserts
  `app/(auth)/<href>/page.tsx` exists on disk. This is what makes the fix stick: the same drift
  produced 14 dead links over five phases with nothing to catch it.

### 3. `CLAUDE.md` corrections

Fix, in place, each contradiction listed in the audit:
- Delete the `protectedPaths` paragraph from "Routing structure"; replace with what
  `middleware.ts` actually does (`publicPaths` + `/shares/` prefix + `matcher` catch-all).
- Delete the `auth_token` parenthetical from "Auth model".
- Correct the `app/generated/prisma/` line: gitignored, **not** checked in — a fresh clone or a
  `schema.prisma` change requires `npx prisma generate` before `tsc` means anything.
- Delete the "Miscellaneous" bullets about `lib/security_*.ts` and `page copy.tsx`.
- Add a **"Dev environment setup"** section with the sequence this session had to rediscover:
  `npm install` → `npx prisma generate` → point `DATABASE_URL` at a DB whose migrations are
  applied (`npx prisma migrate status` to confirm) → `docker compose up -d` for Redis on 6380 →
  `npm run dev`. Include the two failure signatures seen here so the next session recognises
  them instead of re-diagnosing: `'vitest' is not recognized` (devDeps not installed) and
  `tsc` errors naming `ReportOutputType`/`report_files` (stale generated client).

### 4. `README.md` / `SETUP.md`

Rewrite both to describe this system — a report management/discovery platform on Next.js 16 +
Prisma 7 + PostgreSQL with the port 3501 convention, the auth model, and the dev-environment
sequence above — instead of the auth-starter scaffold they still document. Keep them short and
non-duplicative: `README.md` = what this is and how to run it; `SETUP.md` = environment
prerequisites and the DB/Redis setup; anything about *phases* stays in `document/`.

### 5. `document/feature-list.md`

Correct the CI/audit row's stale reason (`next@14.2.18`/`postcss`/`sharp` → ของค้าง #9), and
refresh the row for any file 6a deletes.

### Verification (6a)

- `npx tsc --noEmit` → 0 errors; `npm test` → all green (including the new
  `lib/menu-list.test.ts`).
- `npx eslint .` → warnings drop by exactly the count owned by the deleted files (4 from
  `page copy.tsx`, plus whatever `right-drawer.tsx`/`manage/page.tsx` own); record the new
  number — it becomes 6c's starting point.
- `npm run build` → exit 0 (run it with the dev server stopped, per `CLAUDE.md`'s warning).
- Dev server: sidebar renders with no dead entries, and every remaining leaf navigates to a real
  page — click through each group rather than trusting the new test alone.
- The three pages that use `dialog-drawer.tsx` (`reports/categories`, `reports/tags`,
  `user-management/user-department`) still open their dialog and save — proof that "delete the
  scaffolds" did not overreach.
- `grep -rn "security_get\|security_post\|page copy\|right-drawer\|role-management/manage"`
  returns nothing outside `document/` history.

---

## Sub-phase 6b — auth/ACL route-handler test suite

The regression net for 6c, and the test that ของค้าง #13 should have had.

### 1. Extend `prisma/seed-ci.ts`

Add roles `ADMIN` and `SUPER_ADMIN` (the seed already creates `USER`) plus one user per role,
using the same "find-first-or-create, safe to re-run" style already there. Keep the existing
`USER`/category/user rows untouched so `lib/report-acl.test.ts` keeps working.

### 2. Test harness helper (new, e.g. `lib/test-helpers/route-request.ts`)

Small and single-purpose: given a `UserSessionType`, build a `NextRequest` carrying the
`auth-token` cookie produced by `createToken()` (the real signer — no hand-rolled JWTs), for a
given method/URL/body. Route handlers under test read auth via `getAuthFromRequest(req)`, not
`cookies()`, so no Next.js request-scope faking is needed. Handlers taking dynamic params get
them as `props.params` = a resolved promise, matching how Next.js calls them.

### 3. The matrix

Import the handlers directly (`import { GET } from '@/app/api/reports/browse/route'`) and assert
status codes for `role × endpoint × report visibility`:

| Endpoint | Method |
|---|---|
| `/api/reports/browse` | GET |
| `/api/reports/favorites` | GET, POST |
| `/api/reports/favorites/[reportId]` | DELETE |
| `/api/reports/[id]` | GET |
| `/api/reports/[id]/download` | GET |
| `/api/reports/[id]/files/[fileId]/download` | GET |
| `/api/reports/[id]/files/[fileId]/preview` | GET |

Roles: `USER`, `ADMIN`, `SUPER_ADMIN`, a user whose `roles` is null, and no cookie at all.
Visibility fixtures: one PUBLIC+PUBLISHED report, one RESTRICTED report with no grant, and the
same RESTRICTED report with an individual `report_permissions` grant.

Cases that must be asserted explicitly because they are the ones that broke:
- `ADMIN` gets a non-403 on **every** endpoint in the table (the ของค้าง #13 regression).
- `ADMIN`'s `POST /api/reports/favorites` succeeds on a RESTRICTED report with no grant (the
  admin bypass added with the #13 fix) but still returns 403 for a `report_id` that does not
  exist — not a 500 from the FK.
- `USER` with no grant gets 404 (not 403) on `/api/reports/[id]` and the download routes — the
  deliberate "don't confirm a restricted report exists" shape.
- No cookie → 401 everywhere; a user whose role is null → 403, not a crash.

### 4. Fixtures and cleanup

Prefix everything `VITEST-6B-`, create in `beforeAll`, delete in `afterAll` (`report_files`,
`report_permissions`, `favorites`, `reports`, and any user/role rows the suite itself created),
following `lib/report-acl.test.ts`. The download/preview cases need a real file on disk: write a
few-byte fixture through `lib/storage-path.ts`'s resolver so it lands wherever
`UPLOAD_BASE_PATH` points, and remove it in `afterAll`.

### Verification (6b)

- `npm test` → all suites green locally against a DB whose migrations are applied.
- **Prove the suite catches #13**: temporarily remove `'admin'` from `routeAcceptted('user')`
  in `lib/auth.ts` → the ADMIN rows of the matrix must fail; restore it → green. A test suite
  that cannot fail is not a net.
- Same proof for the favorites admin bypass: revert `app/api/reports/favorites/route.ts`'s
  `isAdmin` branch → the RESTRICTED-report ADMIN case must fail; restore → green.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → no new warnings from the new files.
- CI: the suite runs green on the runner (Postgres service + extended `seed-ci.ts`), not just
  locally.

---

## Sub-phase 6c — Lint sweep to 0 + CI ratchet

### 1. `logDevError()` (new, `lib/log-dev-error.ts`)

Replaces the 60 occurrences of `process.env.NODE_ENV === 'development' && console.log(error)`
across 38 route handlers. Behaviour must stay identical: log to the console in development,
silent otherwise. No pino wiring here — the point is to create one seam so that decision can be
made once later, not to change logging behaviour inside a lint sweep. The remaining 2
`no-unused-expressions` warnings are unrelated and get read individually.

### 2. The 128 `no-unused-vars`

Rules of engagement, because this rule has twice turned out to be guarding real bugs in this
repo (5f found two; ของค้าง #2 is the same lesson at the type level): for each warning, decide
*why* the binding is unused before deleting it. An unused destructured field, an unused function
parameter that a caller still passes, or an unused import of something that was supposed to be
called are all signals to look at the surrounding logic first. Anything that turns out to be a
real bug gets fixed and recorded in `00-progress.md`, not silently deleted along with the
warning.

### 3. `react-hooks/set-state-in-effect` (23)

5f already took this rule from `error` to `warn` **repo-wide** in `eslint.config.mjs`, with its
reasoning written into the config (the rule is a performance hint, and "fixing" all 23 means
restructuring each component's data fetching). 6c's job is to narrow that blanket downgrade
into an `off` override scoped to the files that actually contain the pattern — listed
explicitly, so a *new* file introducing it still gets flagged — and to keep 5f's justification
comment next to it. No new hook abstraction, no per-line `eslint-disable` comments scattered
through JSX, and no widening of the exception beyond the current 23 sites.

### 4. `react-hooks/incompatible-library` (7) + `exhaustive-deps` (2)

Read each one. `exhaustive-deps` in particular can hide a stale-closure bug; if a dependency is
genuinely missing, fix the code, don't silence it.

### 5. CI ratchet

Lower `.github/workflows/ci.yml`'s `npx eslint . --max-warnings 222` to `--max-warnings 0` and
update the comment above it (it currently explains the 222 ratchet and cites ของค้าง #11, which
this sub-phase closes).

### Verification (6c)

- `npx eslint .` → **0 errors, 0 warnings**; `npx eslint . --max-warnings 0` exits 0, and
  introducing one deliberate warning makes it exit non-zero (then revert it).
- `npx tsc --noEmit` → 0 errors; `npm test` → green, **including 6b's matrix** — this is the
  evidence that touching 38 route handlers was behaviour-preserving.
- `npm run build` → exit 0, dev server stopped.
- Live-check one endpoint per shape whose catch block was rewritten (a 200, a 400 validation
  failure, a 403, and a forced 500) and confirm the response bodies and dev-console output are
  what they were before.
- Every UI page whose file was edited for `no-unused-vars` gets opened in the dev server; note
  in `00-progress.md` any file where the warning turned out to be a real bug.

---

## Out of scope / backlog after Phase 6

Unchanged in `00-progress.md`'s ของค้าง section: i18n (`next-intl`) as its own phase; a real job
scheduler for the two manually-invoked `/api/system/jobs/*` endpoints; email delivery for
high-severity notifications; dashboard stat cache/precompute; S3/MinIO storage backend (5e made
the local path configurable, not the backend); antivirus scanning of uploads; support tickets
(schema only); fuzzy/typo-tolerant search; server-side pagination on the remaining list pages;
sidebar navigation becoming DB-driven; dropping the dead `report_versions` table (ของค้าง #3,
still awaiting sign-off — offered for this phase and declined); ของค้าง #9 (`deepmerge-ts` via
`@prisma/config`, no fix available); and the pages the 14 removed menu entries pointed at, if
they are ever actually wanted.

Also still open, independent of this phase: nobody has yet seen `.github/workflows/ci.yml`
run green on GitHub (`gh` is not installed on this machine — it needs checking from the Actions
tab or after installing the CLI).
