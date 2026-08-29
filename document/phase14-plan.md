# Phase 14 — Report Library demo-fidelity fixes + navbar polish

## Context

`document/demo_page/report-library-redesign.html` is the original Phase 13 demo artifact
(referenced by name in `phase13-plan.md` — "A demo artifact (`report-library-redesign.html`) was
built... The user approved it"). It was never committed (still shows as `?? document/demo_page/`
in `git status`), so the user asked for a fresh side-by-side comparison against the real
`/reports/report-list` implementation to see how much drift there is between the approved mockup
and what actually shipped.

Finding (full comparison done via a research pass over `lib/menu-list.ts`,
`components/layouts/{sidebar,menu,navbar,user-nav,notification-bell}.tsx`,
`components/ui/{locale-toggle,mode-toggle}.tsx`, and every component under
`app/[locale]/(auth)/reports/report-list/components/`): **most of the demo is already implemented
faithfully or better** — quick-action tiles, category folder cards, report cards (thumbnail/badge/
status pill/lock icon/tag chips/favorite star), real pagination, and real file preview all match or
exceed the mockup (the mockup used fake in-memory data and a fake lined-box modal; the real app has
live data and a real PDF `<embed>`/file-kind switcher). A handful of genuine, undocumented
deviations remain, confirmed with the user one-by-one (see Resolved decisions) — this phase closes
those.

Deliberately **not** touched (documented, intentional deviations already decided during Phase 13,
not reopened here): no status filter dropdown (status is fixed to `PUBLISHED` per `feature-list.md`
FR-5), quick-action tiles admin-gated, category folder tint is a hash-based palette not real
`categories.icon/color` data.

## Resolved decisions (user, 2026-08-29)

1. **Sidebar icon-reuse bug** — fix. `lib/menu-list.ts` currently gives "สร้างรายงาน" (report-create),
   "หมวดหมู่" (categories), and "แท็ก" (tags) the exact same `Tag` icon, even though the report-list
   page's own `QuickActions` tiles already use 3 distinct icons (`Plus`/`FolderTree`/`Tags`) for the
   same 3 destinations. Align the sidebar to match.
2. **Consolidate the report-card preview modal.** `reportCards.tsx` (card view) has its own ad-hoc
   `Dialog` + raw `<embed type="application/pdf">` (PDF-only, no file-kind switching); `reportMainTable.tsx`
   (table view) already uses the shared, more capable `components/shared/reportPreviewDialog.tsx`
   (fetches full report detail, supports multiple files with a file-kind switcher, delegates actual
   rendering to `reportFilePreview.tsx` — the same component `report-detail` uses). Card view adopts
   the shared component; the duplicated inline implementation is deleted.
3. **Add a page-head (h1 + subtitle) to report-list**, matching the demo's `.page-head` block. Today
   the page title only appears in the navbar's `<h1>` (via `ContentLayout`'s `title` prop) with no
   subtitle anywhere.
4. **`LocaleToggle` becomes a 2-button pill** (EN | TH both visible, current one highlighted) instead
   of a single button that shows only the current locale and toggles on click. This is a **global**
   component (rendered by `Navbar`, which every authenticated page uses via `ContentLayout`) — the
   change affects every page, not just report-list, and was confirmed with the user as in-scope.
5. **`UserNav` shows name + role inline in the topbar**, not hidden behind a click on the avatar.
   Also global (same reasoning as #4). Implementing this surfaced a pre-existing bug — see next
   section.
6. **Report-list defaults to card view** on first load (currently defaults to table/list view).
7. **Remove the bulk-select/details-panel toolbar placeholder buttons.** These were added during
   Phase 13 as disabled "coming soon" stand-ins to match the demo's *icon count* in the toolbar, but
   neither feature exists anywhere in the app yet and the demo itself doesn't have them (the demo's
   toolbar only ever had the card/table view toggle). Remove until there's a real feature to back
   them.
8. **Category folder icons stay generic (`Folder` for every category)** — no per-category icon
   mapping. `categories.icon`/`categories.color` are real schema columns but are never populated
   through the admin category-form UI, so building per-category icons now would mean designing a new
   icon-picker UI with no immediate consumer beyond this one folder row. Explicitly closing this as
   "no change" rather than leaving it as an open question.

## Real bug found during research (not a demo-fidelity gap — pre-existing, independent of this phase's trigger)

`components/layouts/navbar.tsx:26` hardcodes `<UserNav user={null} />` — the commented-out
`getCurrentUser()` call two lines above (`navbar.tsx:6,13`) was never wired up. `ContentLayout`
(the shared page-chrome wrapper, ~23 call sites across the app) never resolves or passes the
logged-in user into the navbar at all. **Today, in production, `UserNav`'s dropdown name/username
lines are always blank** — resolved decision #5 (show name+role inline) can't be implemented without
fixing this at the same time, since there is currently no real user data reaching the component by
any path.

## New endpoint

**`GET /api/auth/session`** — `routeAcceptted('user')` (any authenticated tier). Thin wrapper around
`getCurrentUser()` (`lib/auth.ts`) — returns `{ success, data: { id, first_name, username, role } }`
where `role` is `roles.name` straight from the JWT payload (`createToken` already embeds
`roles: user.roles` — see `lib/types.ts`'s `UserSessionType`/`UserRolesType`), so **no DB query is
needed**, this is a pure session-decode wrapper. 401 with no cookie, same pattern as every other
authed route.

### Alternative considered and rejected

Thread `user` as a prop through every `ContentLayout` call site instead of adding an endpoint:
rejected. `ContentLayout` has ~23 callers, a mix of server components that already call
`getCurrentUser()` themselves (`profile/page.tsx`, `dashboard/page.tsx`, `report-detail/[id]/page.tsx`)
and client components that don't (`reportListView.tsx`, most of `tickets/`, `settings/`, etc.) —
every client caller would need its own new server-side user resolution and prop-drilling just to
satisfy `Navbar`'s signature. A single client-side self-fetch on mount inside `UserNav` (the same
pattern `NotificationBell` already uses for `GET /api/notifications`) fixes the bug for **every**
page at once via one shared component, without a 23-file prop-threading change.

## Resolved decision: role label

No role-name → display-label translation exists anywhere in the codebase today (`user-form/page.tsx`
shows raw DB role names in a plain `<select>`). Rather than invent a new label-mapping layer for one
topbar chip, show `roles.name` as-is (e.g. `SUPER_ADMIN`). Flagged to the user as something to revisit
if a real translated label is wanted later — small, additive, no rework required.

## Files

**New:**
- `app/api/auth/session/route.ts`

**Modified:**
- `lib/menu-list.ts` — report-create/categories/tags menu entries: `Tag` → `Plus`/`FolderTree`/`Tags`
  respectively (drop the `Tag` import if it becomes unused elsewhere in the file).
- `components/ui/locale-toggle.tsx` — rebuilt as a 2-button pill; reuses existing
  `common.languageEnglish`/`common.languageThai` message keys, no new i18n keys expected.
- `components/layouts/user-nav.tsx` — add `"use client"` self-fetch of `GET /api/auth/session` on
  mount (mirrors `NotificationBell`'s polling pattern, but a single fetch — session identity doesn't
  need re-polling); render name+role inline next to the avatar trigger; dropdown content (Dashboard/
  Account/Logout) now sourced from the fetched user instead of an always-`null` prop.
- `components/layouts/navbar.tsx` — remove the dead `user={null}` prop and the commented-out
  `getCurrentUser` import/call once `UserNav` is self-sufficient.
- `app/[locale]/(auth)/reports/report-list/components/reportListView.tsx`:
  - add an `<h1>` + subtitle block under the breadcrumb (new `reports.list.pageSubtitle` key)
  - `useState("table")` → `useState("card")`; `ToggleGroup`'s `defaultValue="table"` → `"card"`
  - remove the bulk-select/details-panel disabled-button block and its `TooltipProvider` wrapper
- `app/[locale]/(auth)/reports/report-list/components/reportCards.tsx` — drop the inline `Dialog`/
  `<embed>` block and now-unused imports; render the shared `<ReportPreviewDialog>` instead, tracking
  `previewReportId: string | null` rather than the whole report object.
- `messages/en/reports.json`, `messages/th/reports.json` — add `list.pageSubtitle`; remove the
  now-unused `list.toolbar.selectMultipleComingSoon`/`list.toolbar.detailsPanelComingSoon` keys.
- `messages/en/nav.json`, `messages/th/nav.json` — audit whether `userMenu.*` needs a `role` label key
  once the chip is built; likely no new keys (raw role string, per the resolved decision above).

No schema/migration changes, no new npm dependencies.

## Verification

1. `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → unchanged baseline green.
2. `GET /api/auth/session` — curl with no cookie → 401; logged in → real `{first_name, username, role}`.
3. Live in Chrome (not just curl), logged in as both an admin and a normal user:
   - Topbar shows real name + role next to the avatar without a click; the dropdown still opens and
     still shows the same real name/username (regression check — this was blank before the fix).
   - Locale pill shows EN and TH simultaneously, current one visually active; clicking the inactive
     one switches locale and persists across reload (Phase 11's `NEXT_LOCALE` cookie behavior,
     unregressed).
   - `/reports/report-list` loads in **card** view by default; new h1+subtitle render under the
     breadcrumb; the two disabled placeholder toolbar buttons are gone; sidebar now shows 3 distinct
     icons for สร้างรายงาน/หมวดหมู่/แท็ก instead of the same `Tag` three times.
   - Card view: clicking the preview-eye on a PDF report opens the same shared dialog table view
     already uses (file-kind switcher visible for a report with multiple files) — confirms the two
     preview code paths are now actually the same component, not just visually similar.
4. Spot-check `/dashboard`, `/profile`, `/reports/favorites` to confirm the global `UserNav`/
   `LocaleToggle` changes didn't break navbar rendering anywhere outside report-list.
5. Update `document/00-progress.md` (new Phase 14 row + "ตอนนี้อยู่ตรงไหน" section) and commit
   `feat: Phase 14 - report library demo-fidelity + navbar fixes`.
