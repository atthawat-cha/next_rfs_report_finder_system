# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

This is "RFS Report Finder System" — an internal report management/discovery platform (Next.js App Router). The problem it solves (see `document/requrisement.md`): reporters were re-creating reports that already existed because there was no central, searchable place to find, preview, and reuse prior reports. The system has two user classes:

- **Users**: search/find reports, preview sample data, download blank report forms, export sample data, bookmark favorites, and only see reports they have permission to view.
- **Admins**: full CRUD on report metadata (name, uploaded files — report/jasper/pdf/sample data, blank PDF form, variables, queries — one of which is the "main" query), fine-grained per-report access control (by user or role: view/edit/delete/favorite/export/print), version control on files and queries, activity logs, and a usage dashboard.

Despite the repo/package name ("nextjs-auth-starter" / `next_rfs_report_finder_system`), this has grown well past an auth starter — treat the README.md/SETUP.md at the repo root as stale/aspirational, not authoritative; they describe an early scaffold state.

## Commands

```bash
npm run dev      # start dev server on http://localhost:3501 (not 3000)
npm run build    # production build
npm start        # run production build, also on port 3501
npm run lint     # next lint
```

There is no test runner configured in this repo.

### Database (Prisma 7 + PostgreSQL)

Prisma config lives in `prisma.config.ts` (not `package.json`), schema at `prisma/schema.prisma`, generated client output at `app/generated/prisma/` (import from `@/app/generated/prisma/client`, not `@prisma/client`).

```bash
npx prisma migrate dev      # create/apply a migration
npx prisma generate         # regenerate client into app/generated/prisma
npx prisma db seed          # runs prisma/seed.ts (tsx prisma/seed.ts)
```

`prisma/seed.ts` composes seed steps from `prisma/seeds/*.ts` (users, reports, menus, permissions, role_permissions, roles) — most are commented out in `main()` by default, so uncomment only the ones you need before reseeding.

Required env vars (`.env` / `.env.local`, not committed with real values): `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`.

## Architecture

### Routing structure

- `app/(auth)/...` — the authenticated application shell (dashboard, reports, role-management, user-management, permissions, profile). All pages here render inside `app/(auth)/layout.tsx`, which wraps content in the sidebar/navbar layout from `components/layouts/`.
- `app/login/`, `app/page.tsx` — public/unauthenticated pages.
- `app/api/**/route.ts` — Route Handlers, grouped by domain: `api/auth`, `api/baseconfig`, `api/reports/report/manage`, `api/users/*` (departments, roles, permissions, user).
- `app/generated/prisma/` — generated Prisma client, checked in generated code; do not hand-edit, regenerate via `npx prisma generate` after schema changes.

Route-group naming caution: because Next.js strips `(auth)` from the actual URL, a page at `app/(auth)/dashboard/page.tsx` is served at `/dashboard`, **not** `/(auth)/dashboard`. `middleware.ts` currently lists `protectedPaths` as `['/(auth)/dashboard', '/(auth)/profile']`, which will never match a real pathname — the actual gate that runs today is "any path not in `publicPaths` requires a decoded user," driven by the `matcher` config, not by `protectedPaths`. Keep this in mind before assuming `protectedPaths`/`publicPaths` control access — verify against `matcher` and the real auth check in `middleware()`.

### Auth model

- JWT-based, via `jose` (`lib/auth.ts`), stored in an httpOnly cookie named `auth-token` (note: `middleware.ts` reads a cookie named `auth_token` when logging — these differ; `getAuthFromRequest`/`getCurrentUser` use `COOKIE_NAME = 'auth-token'`, which is the one that actually matters for auth state).
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

- shadcn/ui (`style: new-york`, `baseColor: neutral`) — primitives in `components/ui/`, composed feature components in `components/shared/` (`dataTable.tsx`, `dialog-drawer.tsx`, `right-drawer.tsx`, `searchInput.tsx`, `permissions-form.tsx`, `fileuploading.tsx`) and `components/layouts/` (sidebar/navbar/menu shell).
- Tables use `@tanstack/react-table` — the pattern is a `*Column.tsx` (column defs) + `*Table.tsx`/`*MainTable.tsx` (page-level data fetch + state) + `SharedDataTable` from `components/shared/dataTable.tsx` for rendering. See `app/(auth)/reports/categories/components/` or `.../tags/components/` for the reference implementation to copy when adding a new manageable list.
- Global client state: `zustand` (`hook/useStore.ts`), plus `hook/useSidebars.ts` and `hook/useMediaQuery.ts`. **Import these as `@/hook/...` (singular)** — `components.json` declares the shadcn alias as `@/hooks`, but no such directory exists; the real directory is `hook/`.
- Theming via `next-themes` (`components/provider/themeProvider.tsx`, `components/ui/mode-toggle.tsx`) — light/dark, per the requirement doc.
- Path alias: `@/*` maps to the repo root (`tsconfig.json`), so `@/lib`, `@/components`, `@/app/generated/prisma`, etc.

### Miscellaneous

- `lib/security_get.ts` and `lib/security_post.ts` exist but are currently empty — don't assume they contain active logic.
- Files under `app/(auth)/reports/report-create/page copy.tsx` are stray/duplicate scratch pages left in the tree; don't treat them as the canonical implementation of that route.
