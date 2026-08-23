# Phase 9 — Standardize UI Language to Thai

> **2026-08-23 update:** this plan was written before Phase 10 (report editor tabbed redesign,
> `phase10-plan.md`) shipped. Phase 10 restructured exactly the two files sub-phase 9b/9c call out as
> the largest single sources of strings: `report-edit/[id]/page.tsx` shrank drastically and most of
> its content (and new content — sub-reports, Param/Query scoping, Doc purpose-tags — that didn't
> exist during this plan's original audit) moved into `components/reportEditor/{paramTab,queryTab,
> subTab,docTab,historyTab}.tsx`; `report-create/page.tsx` gained the same shared components plus new
> strings of its own (the "created successfully" banner, disabled-field states). **9b/9c's file lists
> below are followed as a starting map, not a literal string count** — before translating either
> sub-phase, re-grep the current state of these files rather than trust the string counts quoted
> here, which predate Phase 10.

## Context

Phase 8 closed the entire backlog reachable without external infra/credentials. There was no
pre-agreed Phase 9. The obvious remaining candidate was i18n — deferred as its own future phase
since Phase 4e (`00-progress.md` line 19: "4e: i18n แยกเป็นแผนของตัวเองในอนาคต ไม่ใช่ของค้าง").

A research pass (2026-08-22) into what a real `next-intl` setup would require changed the framing
before any code was written:

- `document/requrisement.md` has **zero** mentions of language/locale/multi-language. This was
  never a stated product requirement.
- A true multi-language `next-intl` setup on Next.js 16 App Router requires nesting **every** route
  under a `[locale]` dynamic segment (`app/[locale]/(auth)/...`, `app/[locale]/login`, etc.) and
  reworking `proxy.ts`'s auth-gate logic (`publicPaths`, the `/shares/` bypass, the `matcher`) to
  strip the locale prefix before matching — a substantial, security-adjacent rewrite of the exact
  file `CLAUDE.md` names for "extra care."
- What actually exists today is not a missing-feature gap but an inconsistency: the UI mixes
  English chrome (button labels, page titles, toasts) with Thai content (pagination, filters,
  empty states) inside the *same* pages, with no logic anywhere selecting between them.

**Resolved decision (user, 2026-08-22)**: this phase does **not** add multi-language switching.
No `next-intl`, no `[locale]` routing, no `proxy.ts` change. Scope is narrowed to standardizing all
user-facing UI text to a single language — **Thai**, chosen because the organization (`mfu.ac.th`)
and the majority of existing labels are already Thai. This is a content-string sweep only.

## Audit — measured, not assumed

A research pass across the live codebase (2026-08-22) inventoried every English user-facing string
still in the app, scoped to: JSX text nodes, button/label/placeholder text, toast messages, table
headers, empty-state text, dialog titles/descriptions, form labels, breadcrumb/nav labels, and
user-visible validation messages. Explicitly **out of scope** for the whole phase (not touched by
any sub-phase): code identifiers, comments, `console`/`logger` messages (dev/ops-facing), API field
names, route/file names, seed data, and `document/*.md`/`CLAUDE.md` content — none of that is a
user-facing string, and translating any of it would violate the working code's actual contracts
(e.g. renaming a Prisma field or a route segment is not an i18n change).

Sizing (approximate, from the audit): **~172 JSX-text occurrences across 35 files** under
`app/(auth)/`, **~44 English toast call sites across 8 files** (heavy overlap with the JSX count —
same files often have both), **24 strings in `lib/menu-list.ts`**, and **~14 strings across
`components/layouts/`+`components/shared/`**. Two files —
`app/(auth)/reports/report-edit/[id]/page.tsx` (58 strings: 32 JSX + 26 toasts) and
`app/(auth)/reports/report-create/page.tsx` (16 strings: 13 JSX + 3 toasts) — account for roughly a
quarter of the entire sweep by themselves.

### Notable findings requiring a decision before implementation

1. **`lib/menu-list.ts` is a plain function, not a component.** `getMenuList(pathname)` returns
   hardcoded English group/menu labels consumed by `sidebar.tsx`/`menu.tsx`/`collapse-menu.tsx`.
   Since there's no i18n library in scope, this is a direct string swap (English → Thai literals)
   with no threading/hook changes needed.
2. **`tickets/**` duplicates status/priority enum display labels in 3 places** —
   `manage/page.tsx`, `createTicketDialog.tsx`, `ticketEditDialog.tsx` each independently render
   `"Open"/"In Progress"/"Resolved"/"Closed"` and `"Medium"/"High"/"Critical"` as literal
   `SelectItem` text. Translating each site independently risks drifting Thai wording between the
   three (e.g. one becomes "กำลังดำเนินการ" and another "อยู่ระหว่างดำเนินการ" for the same enum
   value). **Resolved decision**: extract a single shared label-map constant (e.g.
   `lib/ticket-labels.ts`, `{ [TicketStatus.OPEN]: 'เปิด', ... }`) and have all 3 files import it,
   rather than three independent translations. This is the one place this phase does a small
   refactor instead of a pure string swap, justified by the duplication already being a real
   inconsistency risk, not scope creep.
3. **`components/layouts/navbar-back.tsx`** — audit flagged this as possibly a superseded/unused
   alternate navbar (the app renders `navbar.tsx`, which is already clean). **Resolved decision**:
   confirm actual usage (`grep` for the import) before translating; if genuinely unreferenced, leave
   it untranslated and note it as existing dead code (do not delete it — deleting unrelated dead
   code is out of scope for a language sweep; that's Phase 6a's kind of task, not this one's).
4. **`components/shared/breadcrumb.tsx`** — the generic default breadcrumb component; audit noted
   most pages render their own inline breadcrumb (`DefaultBreadcrumb`) rather than this one.
   **Resolved decision**: same treatment as (3) — confirm real call sites before translating; if
   it has genuine renderers, translate it in 9a since it's a shared component.
5. **`app/page.tsx` and `app/(auth)/blank/page.tsx` are dead/placeholder content.** `app/page.tsx`
   unconditionally `redirect()`s to `/dashboard` or `/login` before its JSX (a full "Welcome to
   Next.js Auth Starter" landing page with feature cards) ever renders. `blank/page.tsx` is a
   leftover shadcn-starter placeholder ("Blank Page") still wired into `lib/menu-list.ts`'s nav.
   **Resolved decision**: translate both anyway rather than delete — each is only a handful of
   strings, and deciding to prune dead pages/nav entries is a content-pruning call independent of
   language standardization; out of scope for this phase (may be worth a future ของค้าง entry, not
   acted on here).
6. **No automated "no-English-string" lint ratchet** (unlike Phase 6c's ESLint-warning ratchet).
   Enforcing "no English text in JSX" as a static rule would produce far too many false positives
   (proper nouns, "PDF", technical field labels, code snippets shown verbatim in `sqlBlock.tsx`,
   etc.). Verification instead relies on the per-sub-phase grep-based re-check in 9f (a manual
   final sweep, not a CI gate) — recorded explicitly so this isn't silently weaker than Phase 6c's
   pattern without a reason.

## Resolved decisions (user + audit, 2026-08-22)

1. Single-locale Thai standardization only — no `next-intl`, no `[locale]` routing, no `proxy.ts`
   change, no language switcher UI.
2. Sub-phase order goes shared-chrome-first (9a) — since `lib/menu-list.ts` and
   `components/layouts/`/`components/shared/` are depended on by nearly every page in every later
   sub-phase, translating them first avoids re-touching the same visual chrome repeatedly — then by
   descending blast radius/size: the single largest file (9b), the rest of the reports domain (9c),
   user-management + role-management (9d), tickets + settings + remaining misc pages (9e), then a
   final verification sweep (9f).
3. Ticket status/priority labels get a shared constant (`lib/ticket-labels.ts`) instead of 3
   independent translations, per finding #2 above.
4. `navbar-back.tsx` and `breadcrumb.tsx` get a usage check before translation; untranslated only if
   confirmed genuinely dead code, not deleted either way.
5. `app/page.tsx` and `blank/page.tsx` get translated (not deleted) despite being low-value content.
6. No lint/CI ratchet for English-string regressions — verification is a manual grep sweep in 9f.
7. Scope boundary (applies to every sub-phase): only strings a real user sees in the running app —
   JSX text, labels, placeholders, toasts, table headers, empty states, user-facing validation
   messages. Never comments, logs, identifiers, API/DB field or route names, or doc files.
8. No new `feature-list.md` row — this phase has no corresponding requirement row to flip, since it
   was never a stated requirement (per the Context section). Progress is tracked in
   `00-progress.md` only.

---

## Sub-phase 9a — Shared chrome: `lib/menu-list.ts`, layouts, shared components

Highest-leverage sub-phase — every other sub-phase's pages render inside this chrome, so doing it
first means later sub-phases never have to re-touch a shared file.

### Files

- `lib/menu-list.ts` — 5 group labels + 19 menu/submenu labels (all English today) → Thai.
- `components/layouts/sheet-menu.tsx` ("Brand"), `user-nav.tsx` ("Profile" tooltip, "Dashboard",
  "Account", "Sign out"), `notification-bell.tsx` ("Notifications").
- `components/layouts/navbar-back.tsx` — confirm usage first (finding #3); translate only if live.
- `components/shared/permissions-form.tsx` ("Permissions", "Select the permissions you want.",
  "Select All", "View", "Create", "Update", "Delete"), `searchInput.tsx` (placeholder
  `"Search..."`), `sqlBlock.tsx` ("Copied", "Copy"), `dataTable.tsx` ("No results.").
- `components/shared/breadcrumb.tsx` — confirm usage first (finding #4); translate only if live.

### Verification (9a)

- Grep confirms no English literal remains in the JSX/string-literal positions changed (spot-check,
  not exhaustive — the exhaustive pass is 9f).
- Live check via the running dev server: sidebar renders all group/menu labels in Thai, user-nav
  dropdown ("Profile"/"Dashboard"/"Account"/"Sign out") shows Thai, a shared `SharedDataTable` empty
  state shows Thai "No results" text, `SearchInput` placeholder is Thai.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green (`lib/menu-list.test.ts`
  in particular — confirm it asserts structure/keys, not the English label text itself, or update
  it if it does); `npm run build` → exit 0.

---

## Sub-phase 9b — `reports/report-edit/[id]/page.tsx` (largest single file)

Isolated into its own sub-phase because it alone is ~58 strings (32 JSX + 26 toasts) covering the
report metadata form, file/query/variable management, version history, and sharing UI — the most
complex single page in the app and worth translating carefully rather than folding into a larger
batch.

### Files

- `app/(auth)/reports/report-edit/[id]/page.tsx` — all field labels ("Name", "Category",
  "Department", "Status", "Access Level", "Downloadable", "Files", "Queries", "Main query",
  "Variables", "Required", "Version History", "Sharing", "Public Link"/"User"/"Department" share
  types, "Can download", "Can edit", "Expires", etc.) and all 26 toast messages ("Report updated",
  "Query added", "Query saved", "Failed to set as main query", "Rollback failed", "Share created",
  "Copied link to clipboard", etc.).

### Verification (9b)

- Live check: open an existing report's edit page, confirm every card/section title, field label,
  and button is Thai; trigger at least 3 of the toasts (save report, add a query, create a share
  link) and confirm each shows Thai text.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green; `npm run build` →
  exit 0.

---

## Sub-phase 9c — Rest of the reports domain

### Files

- `app/(auth)/reports/report-create/page.tsx` — 13 JSX strings + 3 toasts.
- `app/(auth)/reports/report-list/page.tsx` + `reportColumn.tsx` — "Create" link, dropdown
  "Actions"/"View"/"Edit"/"Download", "List"/"Card" toggle labels, 3 toasts.
- `app/(auth)/reports/favorites/page.tsx` + `favReportColumn.tsx` — dropdown
  "Actions"/"View"/"Download", 3 toasts.
- `app/(auth)/reports/categories/**` — page title "Report Categories", form labels
  ("Name"/"Code"/"Description"), dropdown "Actions"/"Edit"/"Delete" (toasts already Thai).
- `app/(auth)/reports/tags/**` — page title "Report Tags", same form/dropdown labels (toasts
  already Thai).
- `app/(auth)/reports/report-detail/[id]/**` — breadcrumb "Dashboard"/"Reports", "Main" badge.

### Verification (9c)

- Live check across each page: create-report form fully Thai (including the 3 toasts — try
  submitting with 0 files selected to trigger the validation toast); report-list dropdown actions
  and List/Card toggle Thai; favorites page and its toasts Thai; categories/tags list+form+dropdown
  Thai; report-detail breadcrumb/badge Thai.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green; `npm run build` →
  exit 0.

---

## Sub-phase 9d — User-management + role-management

### Files

- `app/(auth)/user-management/user-form/page.tsx` — 13 JSX strings + 2 toasts.
- `app/(auth)/user-management/user-list/page.tsx` + `columns.tsx` — "Dashboard", "Users
  Management", "User Lists", dropdown "Actions"/"View Detail"/"Modify".
- `app/(auth)/user-management/user-department/page.tsx` + `dep-columns.tsx` + `deptForm.tsx` —
  breadcrumb, dropdown, form labels, "Cancel" button, 3 toasts.
- `app/(auth)/user-management/activity/page.tsx` — remaining strings ("Activity Log", "Entity"
  label, "Action"/"Entity" table headers — rest already Thai from Phase 8d's own edits).
- `app/(auth)/role-management/roles-columns.tsx` (dropdown "Actions"/"Modify"/"Delete"),
  `role-form/page.tsx` (breadcrumb, "Role Name", "Display Name", 3 toasts), `roles/page.tsx`
  (breadcrumb, "New Role" button), `manage/page.tsx` ("Role Management" title).

### Verification (9d)

- Live check: user-form create flow (both toasts triggerable — success and a forced validation
  error) Thai; user-list breadcrumb/title/dropdown Thai; user-department breadcrumb/dropdown/form/
  toasts Thai (including the "no permission" toast — triggerable by hitting the page as a
  non-admin, or reviewed in code if that's impractical to reproduce live); activity page's 3
  remaining strings Thai; role-management pages (list, create form incl. toasts, manage) Thai.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green; `npm run build` →
  exit 0.

---

## Sub-phase 9e — Tickets, settings, and remaining misc pages

### Files

- `lib/ticket-labels.ts` (new) — shared `TicketStatus`/`TicketPriority` → Thai display-label map,
  per finding #2 / resolved decision #3.
- `app/(auth)/tickets/manage/page.tsx`, `createTicketDialog.tsx`, `ticketEditDialog.tsx` — replace
  their independent literal status/priority `SelectItem` text with the new shared map; translate
  remaining strings ("Ticket Queue", "Status", "Priority", "Assigned To" labels).
- `app/(auth)/settings/storage/page.tsx` ("Upload Base Path"), `settings/menus/page.tsx` ("Menu
  Management"), `menusColumn.tsx` ("Open menu"/"Actions"/"Edit"), `menuFormDialog.tsx`
  ("Sub-menu"/"Href"/"Icon (lucide name)"/"Sort order") — toasts already Thai.
- `app/(auth)/dashboard/page.tsx` ("Home" breadcrumb link), `DashboardAnalytics.tsx` ("IP Address"
  table header) — everything else already Thai from Phase 7c.
- `app/(auth)/blank/page.tsx` ("Home"/"Dashboard"/"Users" breadcrumb, "Blank Page" title) and
  `app/page.tsx` (full dead-code landing page: title, tagline, "Go to Dashboard"/"Get
  Started"/"Learn More", 3 feature cards, "Demo Credentials" block) — per resolved decision #5,
  translated rather than deleted.
- `app/(auth)/profile/page.tsx` ("User ID" label).
- Confirm (no changes expected): `app/login/page.tsx` and `app/shares/**` already have zero flagged
  English UI strings per the audit.

### Verification (9e)

- Live check: tickets queue page's status/priority filters and the create/edit dialogs all show the
  same Thai wording for each enum value (proving the shared map is actually being used, not
  re-duplicated); settings pages (storage, menus + column + form dialog) Thai; dashboard breadcrumb
  and analytics table header Thai; blank page and root `/` (via temporarily hitting it unauthenticated
  before redirect, or code review given it's dead-in-practice) Thai; profile page Thai.
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green; `npm run build` →
  exit 0.

---

## Sub-phase 9f — Final verification sweep

Not a translation sub-phase — confirms 9a-9e actually closed the gap, the way Phase 8c was a
confirm-and-close audit rather than new work.

### 1. Re-run the audit methodology

Re-grep the same scope the original audit used (JSX text nodes with obvious English words, `toast.*`
calls with English literals) across `app/` and `components/` and confirm the counts have dropped to
~0 in-scope hits. Any survivor gets fixed the same way (a direct string swap), not a new pattern.

### 2. Whole-app spot check

Walk through the app live (dev server) end-to-end as both an admin and non-admin-tier session:
dashboard → report search/list/create/edit → favorites → categories/tags → tickets → user-management
→ role-management → settings → profile. Confirm no English UI text remains anywhere reachable in
normal use (excluding the deliberately-out-of-scope categories from the Context section).

### Verification (9f)

- Re-audit grep shows 0 remaining English UI strings in scope (or a documented, justified exception
  list if something is intentionally left, e.g. a genuinely bilingual proper noun).
- Full live walkthrough completed and documented in `00-progress.md` (which pages were exercised,
  what was confirmed Thai).
- `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → green; `npm run build` →
  exit 0.
- `document/00-progress.md` updated: Phase 9 marked closed, HEAD hash refreshed, this phase's
  deviation notes (if any) recorded under its sub-phase sections, matching the established
  convention from Phases 5-8.

---

## Out of scope / backlog after Phase 9

Multi-language switching (`next-intl`, `[locale]` routing, a language switcher UI) — deliberately
not built; would require the routing/`proxy.ts` rework described in Context, and nothing in
`document/requrisement.md` asks for it. An automated CI lint ratchet against English UI strings
regressing — not added, per finding #6 (too many false positives without a proper i18n library
providing a real string-extraction boundary). Deleting `app/page.tsx`'s dead landing-page JSX and
`app/(auth)/blank/page.tsx` as leftover starter-template content — translated instead of removed,
per resolved decision #5; still a legitimate future cleanup candidate. `navbar-back.tsx`/
`breadcrumb.tsx` if confirmed dead in 9a — left as-is, not deleted (that's a Phase-6a-style dead-code
task, not this phase's). Everything already carried forward from Phase 8's own "out of scope" list
(email delivery, real S3/MinIO backend, error-tracking vendor, ของค้าง #9, ของค้าง #3, moving
rate-limiting/logging into `proxy.ts`, confirming CI runs green on GitHub) remains untouched by this
phase.
