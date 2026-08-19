# Phase 5 — Report Detail, Permission Management UI, Configurable System Settings

## Context

Phase 0–4f shipped and verified (`document/00-progress.md`; Phase 4 closed all six sub-phases, `dependency-upgrade-plan.md` closed all four stages, `npx tsc --noEmit` = 0 errors and `npm run build` = exit 0 as of 2026-08-18).

Phase 5's scope comes from a **new requirement list the user committed directly into the repo**: `document/diff_req.md` (`beb62ee`, 2026-08-19), five items:

1. Preview pdf and upload 2 type — pdf for pre-form / pdf full form and simple data
2. can upload pdf and excel
3. display query code zone — display coding box or code snippet ui
4. build permission management page
5. add another setting for system ex. file path or read menu list

### Audit — what already exists vs what items 1–5 actually need

Items 1 and 2 read as "not built yet", but Phase 4c/4e already shipped most of the *backend*. What is genuinely missing is the **page** that exposes it:

- `GET /api/reports/[id]` (4c) returns report + `report_files` (current versions) + resolved `acl` — **no UI consumer exists**.
- `GET /api/reports/[id]/files/[fileId]/download` and `.../preview` (4c) work — reachable only from a dropdown item in the report table.
- `components/shared/reportPreviewDialog.tsx` (4c) previews PDF via `<embed>` and Excel/CSV as a table — dialog only, wired into `reportColumn.tsx`/`favReportColumn.tsx`.
- Upload already accepts both types per `file_kind` (`lib/reportFileUploadServices.ts`): `BLANK_FORM`/`SAMPLE_FILLED_FORM` = `pdf` (10 MB), `SAMPLE_DATA` = `xlsx`/`xls`/`csv` (20 MB).
- `app/(auth)/reports/` has **no detail route at all** — only `report-list`, `favorites`, `report-create`, `report-edit/[id]`, `categories`, `tags`.

Item 3: `sql_text` renders as a bare `<pre className="text-xs bg-muted/40 ...">` in `app/(auth)/reports/report-edit/[id]/page.tsx:951` and is edited in a plain `<textarea>`. No syntax-highlighting dependency exists in `package.json`.

Item 4 is two separate gaps, both real:

- **Per-report ACL has a full API and zero UI.** `app/api/reports/[id]/permissions/route.ts` (Phase 2a) implements GET/POST/PUT/DELETE over `report_permissions` (`subject_type` USER|ROLE × `can_view`/`can_edit`/`can_delete`/`can_favorite`/`can_export`/`can_print`), all four handlers behind `requireRole(req, routeAcceptted('admin'))`. `grep -rn "report_permissions\|reportPermission" --include="*.tsx"` returns **nothing** — the ACL that `lib/report-acl.ts` enforces on every browse/download today can only be administered by direct SQL.
- **`app/(auth)/permissions/page.tsx` is a literal stub** (`<h1>Permission Management</h1>` and nothing else) while `lib/menu-list.ts:150` already links to it. Role→menu permissions can be set **only at role-creation time** (`POST /api/users/roles` → `buildRolePermissionInsert` → `role_permissions.createMany`, driven by `components/shared/permissions-form.tsx` on `role-management/role-form`). Editing an existing role's permissions is impossible: `app/api/users/roles/[id]/route.ts` is `export async function GET(request: Request) { return Response.json({ message: "Hello World" }) }`. Same for `app/api/users/permissions/route.ts`. `app/(auth)/role-management/manage/page.tsx` is also a stub.

Item 5: the `settings` table (key/value/type/category/is_public) got its first real reader/writer in 4e — `GET`/`PUT /api/settings/system` handles exactly two keys (`STORAGE_LIMIT_BYTES`, `MAINTENANCE_MODE`) behind `/settings/general`. Everything else that should be configurable is a code constant: `MAX_SIZE_BY_KIND` in `lib/reportFileUploadServices.ts`, and the upload root, hardcoded in two independent places — the upload service writes under `public/`, and `app/api/reports/[id]/files/[fileId]/download/route.ts:11` resolves `PUBLIC_DIR = path.join(process.cwd(), 'public')` then `path.join(PUBLIC_DIR, file.file_path)`. `lib/menu-list.ts` also links to three pages that do not exist: `/settings/storage`, `/settings/api`, `/settings/theme`.

## Resolved decisions (user, 2026-08-19)

1. **Phase 5 = `diff_req.md`'s five items**, not the older Phase-4 leftovers (i18n, job scheduler, email notifications, `report_versions` drop stay in backlog).
2. **Items 1–2 = build the report detail page.** Explicitly *not* in scope: allowing `pdf` under `SAMPLE_DATA`, reworking the create/edit upload UI, or changing the existing preview limits (200-row Excel cap, `<embed>` PDF viewer, no sheet selector).
3. **Item 3 = read-only highlight + copy**, one shared component used by both the detail page and the existing `<pre>` in report-edit. The edit textarea stays a textarea (no CodeMirror/Monaco).
4. **Highlighting is hand-written and zero-dependency** — a small SQL regex tokenizer in-repo, not `prismjs`/`shiki`. Rationale: this repo just spent an entire plan closing CVEs across `next`/`postcss`/`sharp`, `npm audit` still carries 5 advisories it cannot fix (ของค้าง #9), and the requirement is one language in read-only mode. Theme correctness in light/dark is also easier to guarantee with Tailwind tokens than by mapping a third-party theme.
5. **Item 4 = both halves**: per-report ACL UI *and* filling in the empty `/permissions` page.
6. **Item 5 = four things**: configurable upload path, configurable per-`file_kind` max upload size, an admin menu CRUD screen reading the `menus` table, plus general organisation-level values.
7. **Menu-from-DB stops at a CRUD screen.** The sidebar keeps rendering `lib/menu-list.ts`; swapping navigation to be DB-driven touches every page and is its own phase.
8. **Six sub-phases 5a–5f**, one commit each, per this repo's convention.
9. **Housekeeping folded in as 5f**: refresh `feature-list.md` (stale again — 2FA, password policy, PDF/Excel preview, print, and settings rows still show ❌ although 4c–4f shipped them), add a `docker-compose.yml` for the Redis dev dependency (today a hand-started `rfs-verify-redis` container), and take the lint baseline down: **fix all 36 errors, then add `npm run lint` to CI with `--max-warnings 192` as a ratchet** (blocks *new* warnings, lets the existing 192 be paid down over time). Not in scope: a full 228-problem sweep.

---

## Sub-phase 5a — Report detail page + SQL code block

### 1. `lib/sql-highlight.ts` (new) — pure tokenizer

`tokenizeSql(sql: string): Array<{ text: string; kind: 'keyword' | 'string' | 'number' | 'comment' | 'punct' | 'plain' }>`

Single-pass regex alternation over: line comments (`--…`), block comments (`/*…*/`), single-quoted strings (with `''` escape), numbers, identifiers/words (keyword lookup against a `Set` of ~90 SQL keywords, case-insensitive), punctuation, whitespace. No DOM, no React — kept out of the component so it is unit-testable under Vitest (4b's runner) without jsdom.

Guarantees the tokenizer must hold, and which the tests assert:

- concatenating every token's `text` reproduces the input byte-for-byte (no dropped or duplicated characters — the failure mode that silently corrupts displayed SQL);
- a keyword inside a string or a comment is **not** classified as a keyword;
- an unterminated string/comment at EOF neither loops nor throws.

### 2. `components/shared/sqlBlock.tsx` (new) — read-only display

`<SqlBlock sql={...} maxHeight?={...} />`: renders tokens as `<span>`s coloured with Tailwind theme tokens (no hardcoded hex — light/dark both come from the existing `next-themes` palette), gutter line numbers, `overflow-x-auto`, and a copy button using `navigator.clipboard.writeText` with a transient "Copied" state. Long SQL scrolls inside the block rather than stretching the page.

Replaces the bare `<pre>` at `app/(auth)/reports/report-edit/[id]/page.tsx:951` in the same commit, so the codebase ends up with exactly one SQL renderer.

### 3. `components/shared/reportFilePreview.tsx` (new) — extracted from the dialog

The preview body currently lives inside `reportPreviewDialog.tsx`. Extract the PDF `<embed>` / Excel-table rendering into a standalone component and have **both** the dialog and the detail page render it. This is deliberate refactoring rather than copy-paste: two independent preview implementations would drift the moment either the 200-row cap or the print `.report-print-area` scope changes.

`reportPreviewDialog.tsx` keeps its controlled-dialog behaviour (it deliberately avoids `DialogTrigger` inside `DropdownMenuItem` — a Radix conflict found in 4c) and delegates its body.

### 4. `app/(auth)/reports/report-detail/[id]/page.tsx` (new)

Route name follows the existing `report-edit/[id]` convention. Deliberately **not** `app/(auth)/reports/[id]/`: `reports/` already holds static children (`favorites`, `categories`, `tags`, `report-list`, `report-create`), and while Next resolves static segments before dynamic ones, a dynamic sibling makes every future static child a silent shadowing hazard.

Client component, fetches `GET /api/reports/[id]` once:

- **Header** — `code`, `name`, status + `access_level` badges, category / department, `view_count` / `download_count`, created/updated.
- **Description**.
- **Files section**, grouped by `file_kind` with Thai labels (`BLANK_FORM` = ฟอร์มเปล่า, `SAMPLE_FILLED_FORM` = ฟอร์มตัวอย่างที่กรอกแล้ว, `SAMPLE_DATA` = ไฟล์ข้อมูลตัวอย่าง). Each row shows file name and size, with actions gated on the `acl` the endpoint already returns — Preview (inline `reportFilePreview`), Download (`can_export`), Print (`can_print`, PDF only). The first PDF renders inline on load; other files preview on demand.
- **Queries section — admin only.** `GET /api/reports/[id]/queries` is `requireRole('admin')`; the section is not rendered and the endpoint is not called for non-admins, so no 403 noise. Renders `<SqlBlock>` per query, main query first with a "Main" badge (the endpoint already orders `is_main desc, created_at asc`).
- **Not found** — the endpoint answers 404 (not 403) for a report the caller cannot view, by design; the page shows a plain "ไม่พบรายงาน" state.

**`view_count` double-count guard:** `GET /api/reports/[id]` increments `view_count` server-side. React StrictMode double-invokes effects in dev and this page is the endpoint's first consumer, so the fetch sits behind a `useRef` guard — one page visit must be one increment.

### 5. Entry points

`getReportColumn(...)` and the favorites equivalent: add a "View" `DropdownMenuItem` linking to `/reports/report-detail/{id}`, and make the report-name cell a link to the same place. Both are already factory functions taking a callback (converted in 4c), so no signature churn.

### Verification (5a)

- `npx vitest run lib/sql-highlight.test.ts` — round-trip property, keyword-inside-string, keyword-inside-comment, unterminated-string, empty-input cases all pass.
- Open `/reports/report-detail/{id}` as an admin: header fields match a direct SQL read of that row; every current file listed exactly once.
- SQL block: keywords coloured in **both** light and dark (toggle via the existing mode-toggle), and the copy button puts the exact `sql_text` on the clipboard (paste-compare against `psql` output).
- Non-admin with `can_view` only: page renders, Queries section absent, network tab shows **no** request to `/queries`, Download/Print actions hidden.
- Non-admin without `can_view`: not-found state, API returned 404.
- `view_count` before/after one visit differs by exactly 1 (`SELECT view_count FROM reports WHERE id=...`), including after a hard reload — not 2.
- Excel and PDF preview on the detail page render the same content as the dialog on `/reports/report-list` for the same file (proving the extraction changed nothing).

---

## Sub-phase 5b — Per-report ACL UI

### 1. `components/shared/reportPermissionsDrawer.tsx` (new)

Uses the existing `components/shared/right-drawer.tsx` shell. Props: `reportId` plus open state. On open, `GET /api/reports/[id]/permissions` (which already joins grants to user/role display names).

- **Grants table** — subject (name + USER/ROLE badge) × six checkboxes (`can_view`, `can_edit`, `can_delete`, `can_favorite`, `can_export`, `can_print`), plus a remove action. Toggling checkboxes calls `PUT` (flags only — `subject_type`/`subject_id` are immutable there by design; moving a grant means delete + re-add).
- **Add-grant row** — subject-type toggle plus a `components/ui/combobox.tsx` searching users (`/api/users/user`) or roles (`/api/users/roles`), then `POST`. The endpoint already rejects a duplicate `(report, subject_type, subject_id)` and 404s an unknown subject; surface both as inline errors rather than a generic toast.
- **Delete** — `DELETE` behind a confirm step, since removing a grant can silently make a report invisible to a user.

No new endpoints: all four handlers exist and are admin-gated. Client-side role gating is *not* added — the repo's established pattern is to let the API's 403 be the real gate (same as `/settings/general` in 4e).

### 2. Entry points

- `reportColumn.tsx` — a "Permissions" dropdown item.
- Report detail page (5a) — an admin-only "จัดการสิทธิ์" button in the header opening the same drawer.
- `report-edit/[id]` — the same button near the top of the form.

### Verification (5b)

- Add a USER grant with only `can_view` → that user sees the report in `/reports/report-list` and on the detail page, but Download/Print actions are hidden and `GET .../files/[fileId]/download` refuses as the ACL dictates.
- Flip `can_export` on → the same user's download now succeeds and `download_count` increments.
- Add a ROLE grant, then give the same user a contradicting individual grant → resolution order still matches `lib/report-acl.ts` (individual wins over role).
- Duplicate add → inline "already exists" error and no second row in `report_permissions` (verify by SQL).
- Delete a grant → row gone from the DB, report disappears from that user's list.
- Non-admin hitting the four endpoints directly → 403 on each.

---

## Sub-phase 5c — `/permissions` page (role → menu permissions)

### 1. `GET`/`PUT /api/users/roles/[id]` — replace the `Hello World` stub

- `GET` — the role plus its `role_permissions` joined through `permissions` → `menus`, shaped for `perConvertToCheckbox` (`lib/user-management.ts`), i.e. the same shape `role-form` already feeds `PermissionsFormCheckbox`.
- `PUT` — full replacement of one role's permission set inside a transaction: delete rows for `role_id` that are no longer selected, upsert the selected ones with their `can_view`/`can_create`/`can_update`/`can_delete` flags. Reuses `buildRolePermissionInsert` so create-time and edit-time produce identical rows. Admin-only (`requireRole(req, routeAcceptted('admin'))`), `zod`-validated body, writes an `activity_logs` entry (`entity: 'role'`).

Guard: refuse to strip `can_view` from the permission backing role management itself for the caller's own role — otherwise an admin can lock themselves out of the very screen they are standing on.

### 2. `app/(auth)/permissions/page.tsx` — fill the stub

Role selector (from `/api/users/roles`) → renders the existing `PermissionsFormCheckbox` seeded from `GET /api/users/roles/[id]` → Save calls `PUT`. Reusing that component rather than writing a second matrix is what keeps the create screen and the edit screen from drifting.

`app/(auth)/role-management/manage/page.tsx` is also a stub today. Out of scope here: no new screen, the nav entry stays as-is — recorded in `00-progress.md` as remaining debt rather than silently ignored.

### Verification (5c)

- Load `/permissions`, pick a role → checkbox state matches `role_permissions` rows in the DB exactly (spot-check with SQL).
- Uncheck one menu → Save → row deleted; re-check → Save → row back with the right flags; no duplicate `(role_id, permission_id)` (the unique constraint stays unviolated).
- Verify the effect is real against `/api/baseconfig/permissions` output for that role.
- Try removing the role-management permission from your own role → blocked with a clear error, DB unchanged.
- Non-admin `PUT` → 403; malformed body → 400 from zod.
- One `role` activity-log entry per save.

---

## Sub-phase 5d — Menu CRUD screen

### 1. `app/api/baseconfig/menus/route.ts` (new) + `[id]/route.ts`

Admin-only CRUD over `menus` (`group_label`, `catagory_label` — keep the existing column spelling, `menu_label`, `sub_menu_label`, `href`, `icon`, `sort_order`). `menus.id` is `@default(dbgenerated("gen_random_uuid()"))` — the one model in this schema that does **not** take an application-generated id, so `create` must omit `id`, unlike every other create path in this repo.

`DELETE` needs an explicit warning path: `permissions.menu_id` is `onDelete: Cascade` and `role_permissions.permission_id` cascades in turn, so deleting one menu row silently deletes every role's permissions for it. The endpoint reports the affected permission/role_permission counts under `?dry_run=1`, and the UI requires a confirm that shows those counts.

### 2. `app/(auth)/settings/menus/page.tsx` (new)

`SharedDataTable` plus a `*Column.tsx`, following `app/(auth)/reports/categories/components/` as the reference implementation. Grouped display by `group_label` → `catagory_label`, editable `sort_order`, create/edit through `dialog-drawer.tsx`. Add the nav entry under "System Settings" in `lib/menu-list.ts`.

Explicitly out of scope per decision 7: the sidebar still renders `lib/menu-list.ts`. The page must say so on screen — a short note that these rows drive the permission model, not the current navigation — otherwise the next person assumes editing a row changes the sidebar.

### Verification (5d)

- Create a menu row → it appears in the table and in the menu join behind `GET /api/baseconfig/permissions`; `id` is a real uuid from Postgres, not from `faker`.
- Edit labels/`sort_order` → order in the grouped view changes accordingly.
- `DELETE ?dry_run=1` → returns counts; confirm the delete → those `permissions`/`role_permissions` rows are actually gone (verify by SQL) and `/permissions` (5c) no longer offers the menu.
- The sidebar is unchanged after all of the above, proving the documented boundary.
- Non-admin → 403 on every verb.

---

## Sub-phase 5e — Configurable system settings

### 1. Extend `GET`/`PUT /api/settings/system`

Keep one endpoint and one `upsertSetting` helper (4e) rather than adding a second settings route. New keys:

| key | type | category | note |
|---|---|---|---|
| `UPLOAD_BASE_PATH` | STRING | STORAGE | default `public` |
| `MAX_UPLOAD_SIZE_BLANK_FORM` | NUMBER | STORAGE | default 10 MB |
| `MAX_UPLOAD_SIZE_SAMPLE_FILLED_FORM` | NUMBER | STORAGE | default 10 MB |
| `MAX_UPLOAD_SIZE_SAMPLE_DATA` | NUMBER | STORAGE | default 20 MB |
| `ORG_NAME` | STRING | GENERAL | shown in navbar / print header |
| `ADMIN_EMAIL` | STRING | GENERAL | contact shown on error/empty states |
| `DEFAULT_PAGE_SIZE` | NUMBER | GENERAL | default for list endpoints |
| `DEFAULT_SHARE_EXPIRY_DAYS` | NUMBER | GENERAL | default expiry for new share links |

Every value is `zod`-validated on write (sizes: positive integer with a hard ceiling; `DEFAULT_PAGE_SIZE`: 1–200; `ADMIN_EMAIL`: email or empty).

### 2. `UPLOAD_BASE_PATH` — the item with real risk

Two call sites resolve upload paths independently today: `lib/reportFileUploadServices.ts` writes under `public/`, and `app/api/reports/[id]/files/[fileId]/download/route.ts:11` reads `path.join(process.cwd(), 'public')` joined with `file.file_path`. A configurable root is only safe if both go through one resolver, so introduce `lib/storage-path.ts`:

- `getUploadRoot()` — reads `UPLOAD_BASE_PATH`, resolves relative values against `process.cwd()`, caches in-module with a short TTL (settings changes are rare; a DB read on every download is not acceptable).
- `resolveStoredFile(relPath)` — `path.resolve(root, relPath)`, then **assert the result is still inside the root** (`resolved === root || resolved.startsWith(root + path.sep)`) before any `fs` call. Rejects `..`, absolute `file_path` values, and symlink-style escapes. Existing rows stay valid because `file_path` is already stored relative.
- `PUT` validation of the value itself: reject a path containing `..`, reject a non-existent directory, and reject a directory that is not writable (probe with a temp write). A bad value here breaks every upload *and* every download, so it must fail at write time, not at first use.

Consequence to state plainly: files stored **outside** `public/` are no longer served by Next's static handler, so any UI that links a raw `/uploads/...`-style URL must go through the download endpoint instead. Auditing and converting those links is part of this sub-phase — it is what makes an external path actually work rather than half-work.

### 3. `MAX_SIZE_BY_KIND` from settings

`lib/reportFileUploadServices.ts` currently holds a constant map. Read the three keys through the same cached settings accessor with the existing constants as fallback, keeping the current default-parameter trick so call sites stay untouched. This closes the ⚠️ row in `feature-list.md` ("จำกัดขนาดไฟล์อัปโหลดสูงสุดต่อ `file_kind` แบบตั้งค่าได้") that 4e could only half-close.

### 4. UI

- `app/(auth)/settings/storage/page.tsx` (new) — upload path plus the three size fields. The nav already links here (`lib/menu-list.ts:225`) to a page that does not exist.
- `app/(auth)/settings/general/page.tsx` (4e) — add the four GENERAL fields alongside the existing storage-limit/maintenance controls.

### Verification (5e)

- `PUT` each key → `settings` rows written with the right `type`/`category`; `GET` returns them; invalid values (negative size, `../etc`, non-writable dir, page size 500) are all rejected with a field-level message and **no** DB write.
- Set `MAX_UPLOAD_SIZE_BLANK_FORM` to 1 MB → a 2 MB pdf is rejected with a message quoting 1 MB; raise it back to 10 MB → the same file uploads. (Mirrors 4e's live check, which used an 11 MB file against the hardcoded limit.)
- Point `UPLOAD_BASE_PATH` at a directory **outside** the repo → upload a file → it lands there (verify on disk), the per-`file_kind` download endpoint returns it byte-identical, and preview still parses it.
- Attempt a traversal: set a `report_files.file_path` of `../../secret.txt` by direct SQL, then call download → refused by `resolveStoredFile`, nothing read.
- Revert to `public` → previously uploaded files still download (relative paths unaffected).
- `ORG_NAME` change shows up where it is consumed; `DEFAULT_PAGE_SIZE` changes the default page size of a list endpoint that uses `parsePagination`.
- Non-admin → 403 on `PUT`; unauthenticated → 401.

---

## Sub-phase 5f — Housekeeping

### 1. `feature-list.md` refresh

Stale again: rows for 2FA/TOTP, password policy, PDF inline preview, Excel-as-table preview, client-side print, and "หน้า Settings อ่าน/เขียนตาราง `settings` จริง" still read ❌ although 4c–4f shipped them. Walk **every** row against the code — the 2026-08-17 whole-file pass is the precedent, not a partial touch-up — fold in 5a–5e, and restate the ✅/⚠️/❌ totals.

### 2. `docker-compose.yml` (new)

One `redis:7-alpine` service on host port 6380, matching the hand-started `rfs-verify-redis` container that rate limiting and the 2FA pending-token store depend on (fail-**closed** for 2FA, fail-open for the rate limiter). Postgres deliberately **not** included — the dev DB `nextjs_rfs` is an existing external instance, and a compose-managed one would invite two sources of truth for `DATABASE_URL`. Document the two commands in `SETUP.md` next to the required env vars.

### 3. Lint: fix errors, ratchet warnings

`npm run lint` currently reports 228 problems (36 errors, 192 warnings) — see `00-progress.md` ของค้าง #11. Fix all 36 errors (mostly `@typescript-eslint/no-unused-vars` and `no-explicit-any`, concentrated in `prisma/seeds/*.ts`), leave the warnings, then add a `Lint` step to `.github/workflows/ci.yml` running `npx eslint . --max-warnings 192`. Any *new* warning fails CI; the existing 192 can be paid down by lowering the number. Fixes are behaviour-preserving only — an unused variable that turns out to be a real bug gets its own commit and a note, never a silent deletion (the 4c/4d lesson: a type or lint complaint can be standing guard over a real bug).

### Verification (5f)

- `npm run lint` → 0 errors, ≤192 warnings.
- `npx eslint . --max-warnings 192` exits 0; introducing one deliberate new warning makes it exit non-zero; revert it.
- `npx tsc --noEmit` still 0 errors and `npm test` still passes after the lint fixes, proving they were behaviour-preserving. Run the build check separately — never while the dev server is running.
- `docker compose up -d` from a clean state → Redis reachable on 6380 → the full 2FA login flow works end-to-end (4d's live check).
- `feature-list.md` counts add up to the number of rows.

---

## Out of scope / backlog after Phase 5

Carried forward unchanged in `00-progress.md`'s ของค้าง section: i18n (`next-intl`) as its own phase; a real job scheduler for the two manually-invoked `/api/system/jobs/*` endpoints; email delivery for high-severity notifications; dashboard stat cache/precompute; dropping the dead `report_versions` table (destructive, awaiting user sign-off); ของค้าง #9 (`deepmerge-ts` via `@prisma/config` — no acceptable fix exists yet); the stale root `README.md`/`SETUP.md` beyond the compose note added in 5f; sidebar navigation becoming DB-driven; the `role-management/manage` stub.
