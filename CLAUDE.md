# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

This is "RFS Report Finder System" — an internal report management/discovery platform (Next.js App Router). The problem it solves (see `document/requrisement.md`): reporters were re-creating reports that already existed because there was no central, searchable place to find, preview, and reuse prior reports. The system has two user classes:

- **Users**: search/find reports, preview sample data, download blank report forms, export sample data, bookmark favorites, and only see reports they have permission to view.
- **Admins**: full CRUD on report metadata (name, uploaded files — report/jasper/pdf/sample data, blank PDF form, variables, queries — one of which is the "main" query), fine-grained per-report access control (by user or role: view/edit/delete/favorite/export/print), version control on files and queries, activity logs, and a usage dashboard.

Despite the repo/package name ("nextjs-auth-starter" / `next_rfs_report_finder_system`), this has grown well past an auth starter — `README.md`/`SETUP.md` at the repo root describe this actual system and its real dev-environment setup (rewritten in Phase 6a; they used to describe an early auth-scaffold state and are safe to treat as authoritative now).

## Commands

```bash
npm run dev      # start dev server on http://localhost:3501 (not 3000)
npm run build    # production build
npm start        # run production build, also on port 3501
npm run lint     # next lint
npm test         # Vitest, run once (CI-safe)
npm run test:watch  # Vitest, watch mode
```

**Never run `npm run build`/`next build` while a dev server is already running against this same working copy** — both processes share the `.next` directory, and on Windows a build racing the dev server's open file handles can corrupt `.next` (a real incident: it deleted `.next/server/middleware-manifest.json` mid-build, and every route 500'd until the dev server was restarted after clearing `.next`). To verify a `next.config.js`/build-only change, use `npx tsc --noEmit` plus live verification against the already-running dev server (e.g. `curl -I` for header changes) instead of a parallel build.

### Database (Prisma 7 + PostgreSQL)

Prisma config lives in `prisma.config.ts` (not `package.json`), schema at `prisma/schema.prisma`, generated client output at `app/generated/prisma/` (import from `@/app/generated/prisma/client`, not `@prisma/client`).

```bash
npx prisma migrate dev      # create/apply a migration
npx prisma generate         # regenerate client into app/generated/prisma
npx prisma db seed          # runs prisma/seed.ts (tsx prisma/seed.ts)
```

`prisma/seed.ts` composes seed steps from `prisma/seeds/*.ts` (users, reports, menus, permissions, role_permissions, roles) — most are commented out in `main()` by default, so uncomment only the ones you need before reseeding.

**Before letting any `npx prisma migrate dev` apply, check the generated `migration.sql` for an `ALTER TABLE "reports" ALTER COLUMN "search_vector" DROP DEFAULT` line and delete it if present.** `reports.search_vector` is a Postgres generated column (`GENERATED ALWAYS AS (...) STORED`) declared in schema.prisma as `Unsupported("tsvector")` — Prisma has no first-class generated-column support, so its shadow-DB diff engine periodically proposes dropping a "default" that isn't really one, and Postgres rejects it (`P3018`, generated columns can't have `DROP DEFAULT`). This isn't just a failed-and-nothing-happens error: a real incident during Phase 4d showed a failing migration does **not** roll back statements that ran earlier in the same file — `DROP INDEX` statements ahead of the bad `ALTER COLUMN` line committed for real, silently deleting the full-text search indexes, while the migration still reported failed. Use `npx prisma migrate dev --create-only` to inspect before applying whenever the diff might touch `reports`.

Required env vars (`.env` / `.env.local`, not committed with real values): `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`.

## Architecture

### Routing structure

- `app/(auth)/...` — the authenticated application shell (dashboard, reports, role-management, user-management, permissions, profile). All pages here render inside `app/(auth)/layout.tsx`, which wraps content in the sidebar/navbar layout from `components/layouts/`.
- `app/login/`, `app/page.tsx` — public/unauthenticated pages.
- `app/api/**/route.ts` — Route Handlers, grouped by domain: `api/auth`, `api/baseconfig`, `api/reports/report/manage`, `api/users/*` (departments, roles, permissions, user).
- `app/generated/prisma/` — generated Prisma client; it is **gitignored** (`.gitignore` line 38, `git ls-files` returns 0 files for it), **not** checked in — a fresh clone or any `schema.prisma` change requires `npx prisma generate` before `tsc`/the app can run at all. Do not hand-edit.

Route-group naming caution: because Next.js strips `(auth)` from the actual URL, a page at `app/(auth)/dashboard/page.tsx` is served at `/dashboard`, **not** `/(auth)/dashboard`. `middleware.ts` has no `protectedPaths` concept (Phase 0 removed it, `5e799c1`) — the real gate is: `publicPaths = ['/login', '/']` plus any `/shares/`-prefixed path skip the auth check outright, and the `matcher` config runs `middleware()` on everything else except `/api/*`, `_next/static`, `_next/image`, and `favicon.ico`. Anything not in `publicPaths` that reaches `middleware()` without a decoded user gets redirected to `/login`. Verify against `matcher` and `middleware()` itself, not against a `protectedPaths` list — it doesn't exist.

### Auth model

- JWT-based, via `jose` (`lib/auth.ts`), stored in an httpOnly cookie named `auth-token` (`COOKIE_NAME` in `lib/auth.ts` — this is the only auth cookie name in the codebase; `middleware.ts` does not read or log any `auth_token` cookie).
- `getCurrentUser()` / `getAuthFromRequest(req)` — read + verify the session user from the cookie (server components / route handlers respectively).
- `requireAuth(req)` and `requireRole(req, allowedRoles)` — use inside route handlers; both return either the decoded `JWTPayload` or a `NextResponse` (401/403) — callers must check `instanceof NextResponse` and pass it straight through. This is the standard pattern in every route handler under `app/api/`:
  ```ts
  const authResult = await requireRole(req, acceptedRoles);
  if (authResult instanceof NextResponse) return authResult;
  ```
- `routeAcceptted(access)` (note the existing typo — keep it, don't silently "fix" the exported name without updating every call site) maps a coarse access tier (`'admin' | 'user' | 'guest'`) to the literal role names allowed to call that route.
- Role/permission data model: `users` → `roles` (single role per user via `role_id`) plus a many-to-many `user_roles`; `roles` → `role_permissions` → `permissions` → `menus`. Permission checks in application code are role-name based (see `routeAcceptted`), while the DB also supports finer per-role `can_view/can_create/can_update/can_delete` flags on `role_permissions` for menu-driven permission screens (`role-management`, `permissions` pages).

### Domain model (see `prisma/schema.prisma`)

Central entity is `reports`, linked to `categories`, `departments`, `tags` (via `report_tags`), `favorites`, `downloads`, `report_shares`, and `report_versions`. Reports carry `status` (`DRAFT/PUBLISHED/ARCHIVED`) and `access_level` (`PUBLIC/RESTRICTED/PRIVATE`). File uploads on a report populate `file_path/file_name/file_type/file_size` — uploaded via `lib/fileUploadServices.ts`, which converts images to WebP through `lib/imageConvert.ts` and writes into `public/`.

Note that most models use application-generated string IDs (`faker.string.uuid()` in route handlers / seeds) rather than DB-generated defaults — when adding create logic for a new model, follow that same pattern (generate the id in code) unless the model explicitly uses `@default(dbgenerated(...))` (only `menus.id` does).

### Menus / permissions UI

There are two parallel, overlapping sources of nav menu structure:
- `lib/menu-list.ts` (`getMenuList(pathname)`) — the static menu actually rendered by the sidebar (`components/layouts/sidebar.tsx`, `menu.tsx`) today.
- `document/menu-list.md` and the `menus` Prisma table / `app/api/baseconfig/*` — a DB-driven menu/permission model (with helpers in `lib/user-management.ts`: `buildMenuStructure`, `buildMenusrender`, `buildRolePermissionInsert`, `perConvertToCheckbox`) intended to back the dynamic role-permission editor under `role-management/`.

When working on navigation or permissions, check which of these two the specific page actually reads from — they are not automatically kept in sync.

### UI conventions

- shadcn/ui (`style: new-york`, `baseColor: neutral`) — primitives in `components/ui/`, composed feature components in `components/shared/` (`dataTable.tsx`, `dialog-drawer.tsx`, `searchInput.tsx`, `permissions-form.tsx`, `fileuploading.tsx`) and `components/layouts/` (sidebar/navbar/menu shell). `dialog-drawer.tsx`'s `DrawerDialogDemo` is a real dependency of three pages (`reports/categories`, `reports/tags`, `user-management/user-department`) despite being unsuited as a *reference* to copy for a new dialog — it ignores the `isOpen` prop it's given and can't be seeded with existing data, which is why later controlled dialogs (`ReportPreviewDialog`, `ReportPermissionsDrawer`, `MenuFormDialog`) were written from scratch instead of extending it.
- Tables use `@tanstack/react-table` — the pattern is a `*Column.tsx` (column defs) + `*Table.tsx`/`*MainTable.tsx` (page-level data fetch + state) + `SharedDataTable` from `components/shared/dataTable.tsx` for rendering. See `app/(auth)/reports/categories/components/` or `.../tags/components/` for the reference implementation to copy when adding a new manageable list.
- Global client state: `zustand` (`hook/useStore.ts`), plus `hook/useSidebars.ts` and `hook/useMediaQuery.ts`. **Import these as `@/hook/...` (singular)** — `components.json` declares the shadcn alias as `@/hooks`, but no such directory exists; the real directory is `hook/`.
- Theming via `next-themes` (`components/provider/themeProvider.tsx`, `components/ui/mode-toggle.tsx`) — light/dark, per the requirement doc.
- Path alias: `@/*` maps to the repo root (`tsconfig.json`), so `@/lib`, `@/components`, `@/app/generated/prisma`, etc.

### Dev environment setup

If the working copy hasn't been run in a while, do these in order — skipping one produces a
misleading error that looks like a code problem:

1. `npm install` — devDependencies (Vitest included) can go missing from `node_modules` between
   sessions. Signature: `npm test` says `'vitest' is not recognized` even though `node_modules`
   has hundreds of packages in it.
2. `npx prisma generate` — the client in `app/generated/prisma/` is gitignored (see "Routing
   structure" above), so a fresh clone or checkout has none, and a stale one silently drifts from
   `schema.prisma`. Signature: `npx tsc --noEmit` reports dozens of errors naming things that
   plainly exist in `schema.prisma` (e.g. `ReportOutputType`, `prisma.report_files`).
3. Confirm `DATABASE_URL` (`.env`/`.env.local`) points at a DB with this project's migrations
   applied — `npx prisma migrate status` should say "Database schema is up to date!". A URL left
   over from an older/unrelated DB will connect fine but fail every query.
4. `docker compose up -d` for Redis on port 6380 (`docker-compose.yml` at repo root) — rate
   limiting and 2FA's pending-token step depend on it. Docker Desktop does not auto-start with
   Windows on this machine; if `docker ps` can't reach the daemon, launch Docker Desktop first
   and wait for it before retrying.
5. `npm run dev`.

## Task workflow / Definition of Done

This project is built phase-by-phase (see `document/phase0-plan.md` … `phase3-plan.md`, tracked via git log messages like `feat: Phase 3c - notifications`). Apply this checklist automatically for every phase/sub-phase task **without waiting to be asked** — the point of writing it down here is so the user doesn't have to re-request it each session:

1. **Plan before implementing.** If the target phase only has an "(overview)" section (3a-3e are all fleshed out now; this applies to any future phase, e.g. Phase 4 which has no plan file at all), flesh it out into a detailed sub-section (endpoints, files, auth tier, resolved decisions, Verification list) — matching the level of detail in 3a-3c — before writing code. Commit the plan doc separately first (matches existing history: `d973668 docs: flesh out Phase 2b plan` before `02ee75d feat: Phase 2b`).
2. **Implement per plan.**
3. **Type-check and compare against baseline**, don't just run `npx tsc --noEmit` and react to whatever appears without checking what's actually new. **As of 2026-08-18 the baseline is 0 errors** — `npx tsc --noEmit` should be completely clean, and `npm run build` should exit 0. Any error you see is new; treat it as blocking, don't wave it away as "probably pre-existing."

   > **History:** this baseline used to carry 2 errors (`app/api/reports/report/manage/route.ts`'s `UploadServiceResponse`/`MultipleUploadResult` shape mismatch, `components/ui/combobox.tsx`'s `"icon-xs"` Button size) — both fixed for real on 2026-08-18 (not just type-suppressed): the upload-shape one turned out to be masking a real runtime bug where multi-file report uploads silently produced `undefined` file metadata, plus a missing enum validation on `status`; the combobox one was a genuinely missing `icon-xs` size variant on `Button` (its sibling `InputGroupButton` already had one). See `document/00-progress.md` ของค้าง #2 for the full writeup. Before that, the baseline was 6 errors, 4 of which were mischaracterized as "predating Phase 1" — they were actually a Phase 1 fix (`7a099b8`) silently reverted by a bad merge (`abb4003`) between Phase 2b and 2c, restored in `1e1f05c`. Lesson (twice over now): don't assume a long-standing `tsc` baseline is pre-existing/unrelated/purely-cosmetic debt without checking `git log`/`git diff` and, when in doubt, actually tracing what the type error is protecting against — a merge can silently reintroduce old bugs, and a type mismatch can be standing guard over a real silent runtime bug rather than being a harmless annotation gap.
4. **Manually execute the phase plan's "Verification" bullet list** — these are written as concrete repro steps (e.g. "upload BLANK_FORM twice → GET versions shows 3 rows"), not just aspirational — actually hit the endpoints/UI, don't mark done from reading the code alone.
5. **Update the progress docs** — two files, different jobs, both required:
   - **`document/00-progress.md`** (the single source of truth for "how far along are we") — flip the sub-phase row to ✅ with its commit hash, refresh the header (date / branch / HEAD) and the "👉 ตอนนี้อยู่ตรงไหน" section, and record any new blocker or tech debt under "🚧 ของค้าง" **there** rather than burying it in a phase plan. This file exists because progress info was previously scattered across git log, the phase plans, and `feature-list.md`; keeping it current is what stops that from happening again.
   - **`document/feature-list.md`** status column (✅/⚠️/❌) for any row the task touched. Note: as of 2026-08-17 this file is stale — it still shows Phase 1/2/3a-3c rows as ❌ despite being shipped — refresh the rows you touch, and flag broader staleness rather than doing a silent mass-rewrite.
6. **Commit** with the existing message convention: `feat: Phase Xy - <short description>`.
7. **Extra care** (don't skip verification steps) when touching: auth/session (`lib/auth.ts`, `middleware.ts`), the ACL layer (`lib/report-acl.ts`, `report_permissions`), file upload/path handling (`lib/fileUploadServices.ts`), or any Prisma schema change (`prisma/schema.prisma` + migration) — these are the areas most likely to introduce a real security/data bug versus a cosmetic one.

**Current status: read `document/00-progress.md`** — do not restate phase status here. That file is the one place tracking what is done (with commit hashes), what is left, and what is blocked; duplicating it into CLAUDE.md is how the two drifted apart before. As of 2026-08-17 the short version is: Phase 0 through 3e shipped and verified end-to-end against the live DB, the DB schema drift that had blocked 3e is fully root-caused and closed, Phase 4 not yet planned — but check the file, not this line.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
