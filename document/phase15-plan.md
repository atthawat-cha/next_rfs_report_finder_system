# Phase 15 — Design System Foundation (semantic tokens) + report card visual polish

## Context

Follow-up to the Phase 14 demo-vs-real comparison
(`document/demo_page/report-library-redesign.html` vs `/reports/report-list`). Phase 14
closed the behavioral/structural gaps (shared preview dialog, page-head, default view,
locale pill, user-nav, sidebar icons). The remaining gaps were purely visual and traced to
one root cause: the real app's status/file-type/category colors
(`components/shared/reportDisplayMeta.tsx`) are hardcoded literal Tailwind palette classes
(`bg-emerald-100 dark:bg-emerald-950/40`, etc.) chosen ad hoc per call site, with no shared
token/reference doc — unlike the demo, which defined an explicit token layer
(`--success`, `--pdf`, `--pdf-bg`, …) in its `<style>` block. The user asked to (1) plan and
apply visual fixes, and (2) turn that into a **base design system** the project can reuse
going forward, not a one-off patch.

Deliverable: `document/design-system.md` (token table + component conventions + the rule
for adding a new one) plus the token implementation itself.

## Explicitly out of scope (already decided in Phase 14, not reopened)

- No status filter dropdown on report-list (`phase14-plan.md` — status fixed to
  `PUBLISHED` per `feature-list.md` FR-5).
- No per-category icon mapping (`phase14-plan.md` resolved-decision #8) — folder cards
  keep the generic `Folder` icon; only the *tint* moves from hardcoded classes to tokens,
  the hash-by-id selection mechanism is unchanged.
- `favorites/components/favReportCard.tsx`'s inline `Dialog`/`<embed>` preview (not
  consolidated onto the shared `ReportPreviewDialog` the way `reportCards.tsx` was in
  Phase 14) — a component-reuse/behavior fix, not a token/color change. Recorded in
  `design-system.md` §6 as a known gap, not fixed here.

## Resolved decisions

1. **New semantic tokens, not a rename of existing ones.** `success`/`warning`/`danger`
   (+ `-bg` pairs) and `pdf`/`xlsx`/`doc` (+ `-bg` pairs) and `cat-1`..`cat-6` (+ `-bg`
   pairs) are added to `app/globals.css` (`:root` + `.dark`) and `tailwind.config.ts`.
   `destructive` (existing, used for solid high-emphasis surfaces) is left untouched —
   `danger` is for soft badge tints instead, see `design-system.md` §2 for the reasoning.
   `archived` reuses `muted-foreground` for text (only `archived-bg` is new) — archived
   is deliberately desaturated, not a "warning-family" color.
2. **Token values are the demo's HSL numbers, carried over verbatim** (not re-derived) —
   the demo's palette was already reviewed/approved by the user in Phase 13. Category hues
   are re-expressed from the existing `CATEGORY_PALETTE` Tailwind literals in
   `reportDisplayMeta.tsx` (blue/violet/amber/cyan/emerald/rose) at matching hue angles,
   so the *actual colors picked per category id* don't visually jump — only their
   representation (token vs. literal class) changes.
3. **`reportDisplayMeta.tsx` becomes the only place these tokens are referenced** as
   Tailwind classes. Its 6 existing consumers (`reportColumn.tsx`, `reportCards.tsx`,
   `categoryFolders.tsx`, `favReportColumn.tsx`, `favReportCard.tsx`, plus itself) get the
   new colors automatically with no per-file changes beyond what's listed below.
4. **New: report card thumbnail top accent bar**, sourced from the same category hash
   used for the folder badge (`categoryAccent(categoryId)` returns the raw
   `hsl(var(--cat-N))` string for a `style={{ "--acc": ... }}` + a `before:` pseudo-element
   Tailwind utility), matching the demo's `.thumb::before`. Added to both
   `reportCards.tsx` and `favReportCard.tsx` (visual-only, no behavior change, so doing
   both together is in scope even though the dialog consolidation isn't).
5. **Badge opacity/heaviness fix.** The visual "badge looks heavier/more opaque in the
   real app than the demo" difference traced to `dark:bg-red-950/40` (a very dark red at
   40% alpha over a near-black card ≈ still reads as deep saturated maroon) vs. the demo's
   flat `--pdf-bg: 0 45% 16%` (a mid-lightness solid, no alpha blending). Adopting the
   demo's flat HSL values (no `/NN` alpha suffix) for `-bg` tokens fixes this as a side
   effect of the token migration, not a separate tweak.

## Files

**New:**
- `document/design-system.md` (already written, see repo)

**Modified:**
- `app/globals.css` — add token block (`:root` + `.dark`): `--success`/`--success-bg`,
  `--warning`/`--warning-bg`, `--danger`/`--danger-bg`, `--archived-bg`,
  `--pdf`/`--pdf-bg`, `--xlsx`/`--xlsx-bg`, `--doc`/`--doc-bg`, `--cat-1`..`--cat-6` +
  `--cat-1-bg`..`--cat-6-bg`.
- `tailwind.config.ts` — register all of the above under `theme.extend.colors` as
  `{name}: 'hsl(var(--name))'` / `{name}-bg: 'hsl(var(--name-bg))'` pairs (`cat-1`..`cat-6`
  as a nested `cat: { '1': ..., '1-bg': ..., ... }` group to keep it readable).
- `components/shared/reportDisplayMeta.tsx`:
  - `REPORT_STATUS_STYLES` → `bg-success-bg text-success` / `bg-warning-bg text-warning` /
    `bg-archived-bg text-muted-foreground`.
  - `fileKindMeta` → `bg-pdf-bg text-pdf` / `bg-xlsx-bg text-xlsx` / `bg-doc-bg text-doc`
    (generic/unknown extension keeps `bg-muted text-muted-foreground`, unchanged).
  - `AccessLockIcon` → `RESTRICTED` uses `text-warning`, `PRIVATE` uses `text-danger`
    (were `text-amber-600 dark:text-amber-400` / `text-destructive`).
  - `CATEGORY_PALETTE` → `cat-1`..`cat-6` token classes (`bg-cat-1-bg text-cat-1`, etc.),
    same array/hash mechanism, just token-backed.
  - add `categoryAccent(categoryId): string` — same hash as `categoryTint`, returns
    `hsl(var(--cat-N))` (raw, for a CSS custom property, not a Tailwind class).
- `app/[locale]/(auth)/reports/report-list/components/reportCards.tsx` — thumbnail
  wrapper gets `style={{ "--acc": categoryAccent(report.category_id) } as React.CSSProperties}`
  and a `before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[var(--acc)]`
  utility (or an explicit `<span>` if Tailwind's arbitrary `before:` composition proves
  awkward with the existing `rounded-t-xl overflow-hidden` wrapper — confirm which reads
  cleaner while implementing, both are visually identical).
- `app/[locale]/(auth)/reports/favorites/components/favReportCard.tsx` — same accent-bar
  addition, same mechanism (visual-only; the file's own inline preview dialog is untouched,
  see scope note above).
- `app/[locale]/(auth)/reports/report-list/components/categoryFolders.tsx` — no logic
  change (still calls `categoryTint`), picks up new token classes automatically.

No schema/migration changes, no new npm dependencies, no i18n key changes.

## Verification

1. `npx tsc --noEmit` → 0 errors; `npx eslint .` → 0 warnings; `npm test` → unchanged
   baseline green.
2. Live in Chrome, both light and dark theme, on `/reports/report-list` and
   `/reports/favorites`:
   - Status pills (Published/Draft/Archived) render with the new soft token colors, not
     the old hardcoded emerald/amber/muted classes — confirm dark mode specifically,
     since that's where the opacity/heaviness difference was visible.
   - PDF/XLSX file-type badges on card thumbnails read as a soft flat tint (not a deep
     saturated blend) in dark mode.
   - Report cards show a thin colored top accent strip matching their category folder's
     tint; the same category's folder badge and its cards' accent strips use the same hue.
   - Restricted/Private lock icons still render (amber/red-equivalent), now via
     `warning`/`danger` tokens.
   - No visual regression on `/reports/categories`, `/reports/tags`, `/dashboard` (spot
     check — none of those consume `reportDisplayMeta.tsx`, but confirm nothing else
     imported the removed literal classes).
3. Confirm `document/design-system.md` accurately describes the shipped token names/values
   (update it if implementation deviates from this plan during coding).
4. Update `document/00-progress.md` (new Phase 15 row + "ตอนนี้อยู่ตรงไหน" section) and
   commit `feat: Phase 15 - design system foundation + report card accent polish`.
