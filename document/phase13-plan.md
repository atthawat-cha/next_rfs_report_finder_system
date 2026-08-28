# Phase 13 — Report List Redesign (card-first "Report Library")

## Context

The user shared a reference screenshot of a Cloudy-style file-manager UI (`document/wriefream/ref2.webp`)
and asked for `/reports/report-list` to be redesigned toward that look: a prominent search bar,
a row of quick-action tiles, a "suggested folders" row, and a document-card grid — then asked for
an HTML demo to review before any real code changed. A demo artifact
(`report-library-redesign.html`) was built with mock data matching this project's actual domain
(reports/categories/departments/tags, PUBLIC/RESTRICTED/PRIVATE access, PDF/XLSX file types) and
the app's real shadcn "new-york/neutral" theme tokens, sidebar, and navbar. The user approved it
("ตามนี้เลย") and this phase implements it for real against `/api/reports/browse`.

## Resolved decisions (deviations from the literal demo, decided while implementing)

- **No status filter dropdown.** `feature-list.md`'s FR-5 row already documents that status is
  intentionally fixed to `PUBLISHED` for the general search experience, not a free filter — and
  `visibleReportIdsFor()` (`lib/report-acl.ts`) scopes every caller, including admins, to
  individually-granted rows or `PUBLIC`+`PUBLISHED`, so a status dropdown would mostly return empty
  results and contradict that resolved decision. The demo's status filter was dropped; the status
  **pill** on each card/row stayed (real signal, already selected by the API).
- **Quick-action tile row is admin-only.** Regular users can only search/preview/download/favorite
  (CLAUDE.md's "Users" role) — `report-create`/`categories`/`tags` all 403 for them server-side.
  Showing Create/Categories/Tags tiles that always fail isn't useful, so the whole row (Create
  Report primary tile + Favorites/Categories/Tags) is gated on `isAdmin`, resolved server-side via
  `getCurrentUser()` in a thin `page.tsx` wrapper — same pattern as
  `report-detail/[id]/page.tsx`/`dashboard/page.tsx`. Regular users see the category-folder
  browsing + department filter directly instead. The pre-existing standalone "Create Report" button
  in the toolbar (shown to everyone before this phase) is dropped for the same reason — the admin
  tile already covers it, and it duplicated the same 403-risk for non-admins.
- **Category folder counts and the department filter are ACL-scoped, not full master-data.**
  `GET /api/reports/categories`/`GET /api/reports/tags`/`GET /api/users/departments` are admin-tier
  and return full CRUD rows (icon/color/parent_id/is_active/...) — loosening any of them for a
  browse-only need was rejected in favor of one new minimal, purpose-built endpoint (below).
- **Category card colors are a deterministic hash-based palette, not `categories.icon`/`color`.**
  Those columns exist in the schema but are never populated through the admin UI
  (`categoryFormDialog.tsx` doesn't expose them) — real per-category theming was never wired up
  anywhere in this codebase, so rather than depend on always-null data, folder cards cycle a small
  fixed 6-color Tailwind palette keyed by a hash of `category.id` (`categoryTint()` in
  `components/shared/reportDisplayMeta.tsx`).

## New endpoint

**`GET /api/reports/browse/facets`** — `routeAcceptted('user')` (every authenticated tier,
matching `GET /api/reports/browse` itself). Computes `visibleReportIdsFor(user)` once, then
`prisma.reports.groupBy` on `category_id` and (non-null) `department_id` restricted to those
visible ids, joined back to names. Returns
`{ success, data: { categories: [{id,name,count}], departments: [{id,name,count}] } }` — categories
sorted by count desc ("popular" first), departments alphabetically (filter dropdown). Empty
`visibleIds` short-circuits to `{categories:[],departments:[]}` without querying, same guard as
`browse/route.ts`.

## Real bugs fixed along the way

- **`reportColumn.tsx`/`favReportColumn.tsx`'s `accessorKey: 'department'` never worked.**
  `GET /api/reports/browse` and `GET /api/reports/favorites` both select the `departments` relation
  as a nested `{id,name}` object, not a flat `department` string — `ReportGetDataType` (`lib/types.ts`)
  had claimed the latter, so the Department column in both `report-list` and `favorites` table views
  has silently rendered blank since those columns were written. Fixed the type to match reality
  (`categories?`/`departments?`/`report_tags?`) and both column defs to read
  `row.original.departments?.name`.
- **`version` was never selected** by either `GET /api/reports/browse` or `GET /api/reports/favorites`,
  so the existing "Version" table column rendered blank too, despite `reports.version` always having a
  real value (`@default("1.0")`). Added `version: true` to both selects — one-line, additive, no
  behavior change beyond populating a column that was already declared.

## Files

**New:**
- `app/api/reports/browse/facets/route.ts`
- `components/shared/reportDisplayMeta.tsx` — `ReportStatusPill`, `fileKindMeta()`, `AccessLockIcon`,
  `categoryTint()`. Deliberately under `components/`, not `lib/` — `tailwind.config.ts`'s `content`
  globs don't scan `lib/**/*.ts`, so Tailwind class strings living there risk being purged from the
  production build.
- `app/[locale]/(auth)/reports/report-list/components/quickActions.tsx`
- `app/[locale]/(auth)/reports/report-list/components/categoryFolders.tsx`
- `app/[locale]/(auth)/reports/report-list/components/reportListView.tsx` — the actual client view
  (search/filter/pagination state, facets + favorites fetch-on-mount), moved out of `page.tsx`.

**Modified:**
- `app/[locale]/(auth)/reports/report-list/page.tsx` — now a thin server wrapper resolving `isAdmin`
  (same pattern as `report-detail/[id]/page.tsx`), renders `ReportListView`.
- `app/[locale]/(auth)/reports/report-list/components/reportCards.tsx` — full redesign: mock
  document-face thumbnail with a colored file-type badge (PDF/XLSX/generic), status pill, access
  lock icon, up to 2 tags + overflow count, working favorite star (POST/DELETE
  `/api/reports/favorites`), footer date + download.
- `app/[locale]/(auth)/reports/report-list/components/reportColumn.tsx` — department bug fix +
  status pill.
- `app/[locale]/(auth)/reports/favorites/components/favReportColumn.tsx` — department bug fix only
  (favorites' visual design was left untouched — out of this phase's scope).
- `app/api/reports/browse/route.ts`, `app/api/reports/favorites/route.ts` — `version: true` added
  to both selects.
- `lib/types.ts` — `ReportGetDataType.categories`/`.departments`/`.report_tags` now match the real
  API shape.
- `eslint.config.mjs` — the `react-hooks/set-state-in-effect` allowlist entry for
  `reports/report-list/page.tsx` moved to `.../components/reportListView.tsx` (the file that now
  actually holds the fetch-on-mount effects), following the same "move, don't re-add" precedent
  Phase 11a set when `app/[locale]` restructuring moved these paths before.
- `messages/en/reports.json`, `messages/th/reports.json` — new `list.quickActions.*`,
  `list.categoriesSectionTitle`, `list.manageCategories`, `list.reportCount`, `list.filters.*`,
  `list.status.*`, `list.access.*`, `list.emptyState.*` keys, both locales.

## Verification

- `npx tsc --noEmit` — 0 errors.
- `npx eslint .` — 0 warnings (after moving the `set-state-in-effect` allowlist entry).
- `npm test` — 37 passed / 1 skipped (unchanged baseline).
- Live, logged in as an admin account (`admin2`) against the running dev server, in an actual
  Chrome tab (not just curl):
  - Quick-action tiles, "Popular Categories" folder row (real counts from the new facets endpoint),
    and the "Manage categories" link all render.
  - Clicking a category folder filters the grid (`?category=<id>`), shows an active-filter chip
    with a working clear button, and combines correctly with the department `<Select>`
    (`?department=<id>` narrowed the same result set as expected).
  - Table view: Department and Version columns now show real values (`E2E Fixture Department`,
    `IT Department`, `1.0`) instead of the pre-existing blanks.
  - Card view: document-face thumbnails with PDF badges, status pills, department caption, favorite
    star toggle — confirmed the toggle actually persists server-side (`GET /api/reports/favorites`
    from within the page's own session showed the newly-starred report), not just an optimistic UI
    flip.
  - Empty state (`Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription` — previously
    unused shadcn primitives in this codebase) renders correctly for a zero-result search.
  - Light theme confirmed legible (folder tint colors, status pills, PDF badge, primary tile) — not
    just dark, which is what the dev browser happened to be in by default.
  - Logged in as a real non-admin account (`user`/`123456`) and confirmed the quick-action row and
    "Manage categories" link are both correctly absent, while the category folders, department
    filter, and card/table views all still work identically.
- `GET /api/reports/browse/facets` returns `401` with no cookie (curl), confirming the new route is
  actually gated, not just gated in the handler's intent.

## Known gap / not done here

- The dev server had to be restarted mid-phase to pick up the new `messages/*.json` keys —
  `i18n/request.ts` loads each namespace via a template-literal dynamic `import()`, which doesn't
  appear to participate in Next dev's file-watching the way a statically-analyzable import does.
  Not investigated further (out of scope for this phase); worth remembering if a future session
  edits message JSON and sees raw `namespace.key` strings render instead of translated text — try a
  dev server restart before assuming the key is missing or the component is wired wrong.
