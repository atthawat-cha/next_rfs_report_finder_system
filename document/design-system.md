# Design System — RFS Report Finder System

> Base reference for visual decisions in this app. Read this before adding a new
> status/state color, a new file-type badge, a new category accent, or any other
> "meaning → color" mapping. It exists because before Phase 15 those mappings were
> hardcoded as literal Tailwind palette classes (`bg-emerald-100 dark:bg-emerald-950/40`,
> etc.) directly inside 6+ component files (`components/shared/reportDisplayMeta.tsx`
> and its consumers) with no shared source of truth for *why* a given hue was chosen
> or whether it was reused consistently. This doc + the tokens in `app/globals.css`
> are that source of truth going forward.

## 1. Foundation: shadcn "new-york/neutral"

Base tokens (background/foreground/card/popover/primary/secondary/muted/accent/
destructive/border/input/ring/radius/chart-1..5) come from the shadcn `new-york`
style with `neutral` base color — see `app/globals.css` `:root`/`.dark` and
`components.json`. **Don't hand-roll a new neutral gray scale or a new radius
value** — reuse `background/foreground/muted/accent/border` and
`--radius`/`calc(var(--radius) - Npx)` for anything that isn't a semantic status/
category color (section 2).

## 2. Semantic tokens (added Phase 15)

These live in `app/globals.css` (`:root` for light, `.dark` for dark) and are
registered as Tailwind theme colors in `tailwind.config.ts` so components use
`bg-success-bg text-success` instead of raw `hsl(var(--success))`. Each has a
`DEFAULT` (text/icon color, higher contrast) and a `-bg` (soft tinted background,
low contrast) — the same pairing shape shadcn already uses for
`primary`/`primary-foreground` etc.

| Token pair | Meaning | Used by |
|---|---|---|
| `success` / `success-bg` | Report status: Published | `ReportStatusPill` (`reportDisplayMeta.tsx`) |
| `warning` / `warning-bg` | Report status: Draft; access level: Restricted (lock icon) | `ReportStatusPill`, `AccessLockIcon` |
| `danger` / `danger-bg` | Access level: Private (lock icon) | `AccessLockIcon` |
| `archived-bg` | Report status: Archived (text stays `muted-foreground`, no dedicated `archived` text token — archived is deliberately desaturated, not a "warning color") | `ReportStatusPill` |
| `pdf` / `pdf-bg` | File-type badge: PDF | `fileKindMeta` |
| `xlsx` / `xlsx-bg` | File-type badge: XLSX/spreadsheet | `fileKindMeta` |
| `doc` / `doc-bg` | File-type badge: Word/docx (reserved — `fileKindMeta` has no `isDocxFile` detection yet, so the "anything else" fallback still uses plain `bg-muted text-muted-foreground`, not this token; wire it up if/when docx-specific detection is added) | — (reserved) |
| `cat-1` … `cat-6` / `cat-N-bg` | Category folder accent (hash-picked per `categories.id`, not a name→color mapping — see note below) | `categoryTint`/`categoryAccent` (`reportDisplayMeta.tsx`), `CategoryFolders`, report card thumbnail top accent bar |

**Why `danger` is a separate token from the existing `destructive`:** `destructive`
already exists and is used for solid, high-emphasis surfaces (delete buttons,
destructive dialog actions) — its `DEFAULT` is designed to sit on its own
`destructive-foreground` text, not to be used as a soft badge tint. Reusing it for
badges would either look too heavy (badge as solid destructive-red) or require
redefining what `destructive` means everywhere it's already used. `danger`/`danger-bg`
follow the same soft-badge pairing as `success`/`warning` instead.

**Category color is intentionally not semantic.** `categories.icon`/`categories.color`
are real (unused) schema columns, but nothing in the admin category-form UI
populates them (`categoryFormDialog.tsx`) — building a color/icon picker for that
form is out of scope here (same call Phase 14 made for icons, see
`phase14-plan.md` resolved-decision #8). `categoryTint(categoryId)` /
`categoryAccent(categoryId)` still pick deterministically from a fixed 6-hue
palette by hashing the category's id, same mechanism as before Phase 15 — Phase 15
only moves the 6 hues from hardcoded Tailwind literals into `cat-1..cat-6` tokens
so the palette is documented and reusable (e.g. by the report card's top accent
bar, which previously didn't exist at all).

## 3. Default rule for adding a new one

When a future feature needs a new "meaning → color" mapping (a new report status,
a new file kind, a new alert severity, etc.):

1. **Don't** add a literal Tailwind palette class (`bg-blue-100`, `text-rose-600`,
   etc.) directly in a component for anything that represents a *meaning* (status,
   severity, category, file type). Literal palette classes are still fine for
   *decoration with no meaning* (e.g. an illustration, a one-off marketing page).
2. Add a token pair to `app/globals.css` (`:root` **and** `.dark` — both, always;
   see section 4 for how to pick the dark value) and register it in
   `tailwind.config.ts`'s `theme.extend.colors`.
3. Add a row to the table in section 2 of this doc.
4. Reference it from `components/shared/reportDisplayMeta.tsx` (or a sibling
   shared helper, if the mapping isn't report-related) — not inline in a page
   component — so every consumer stays in sync automatically.

## 4. Picking light/dark values for a new token

Don't just drop the light `--muted-foreground`-style lightness into dark mode —
follow the pattern already used by every pair above: light mode is a **saturated,
darker foreground on a very light, low-saturation background** (e.g.
`--success: 142 71% 29%` on `--success-bg: 142 71% 94%`); dark mode **inverts which
end is light** — the foreground becomes lighter/more saturated so it reads against
a near-black card, and the background becomes a low-lightness (~14-17%),
still-tinted-not-gray dark shade (e.g. `--success: 142 60% 62%` on
`--success-bg: 142 40% 15%`). Keep the hue constant across light/dark; only
lightness/saturation should move. This is exactly the pattern
`document/demo_page/report-library-redesign.html` established and that Phase 15
carried over verbatim — reuse those numbers rather than inventing new ones for the
same meaning.

## 5. Component conventions

- **Status/access/file-type badge** — soft pill or rounded-rect: `bg-{token}-bg
  text-{token}`, never a solid saturated fill (that's reserved for primary
  buttons/destructive actions). A small `h-1.5 w-1.5 rounded-full bg-current` dot
  precedes the label on status pills (see `ReportStatusPill`).
- **Category accent** — a colored square icon badge (`h-8 w-8 rounded-lg`,
  `bg-cat-N-bg text-cat-N`) behind a *generic* icon (`Folder` for every category —
  intentionally not per-category, see section 2), plus (Phase 15) a 3px top accent
  strip on report card thumbnails using the same category's `cat-N` hue, so a
  report card visually "belongs" to its folder without needing a border everywhere.
- **Cards** — `rounded-xl border bg-card shadow-sm`, hover raises to `shadow-md`.
  Thumbnail area is `bg-muted/50` with a mock document face (`bg-card` +
  `border` + `shadow-sm`) — there is no real PDF/XLSX-to-image server-side
  rendering in this system, so this stand-in is deliberate, not a placeholder to
  fix later (see `CLAUDE.md` §Download/Export/Print referenced in
  `reportCards.tsx`'s own comment).
- **Icons** — `lucide-react` throughout; a badge icon is sized `h-2.5 w-2.5` to
  `h-4 w-4` depending on context, never larger inside a badge/pill.

## 6. What this phase deliberately did not touch

Carried over from `phase14-plan.md` (not reopened):
- No status filter dropdown on report-list (status is fixed to `PUBLISHED` for
  non-admin users per `feature-list.md` FR-5).
- No per-category icon (`Folder` stays generic for every category).

~~New scope boundary (Phase 15): `favorites/components/favReportCard.tsx` still has
its own inline `Dialog`/`<embed>` preview...~~ — **closed**, same day, as a direct
follow-up once flagged: `favReportCard.tsx` now uses the shared
`ReportPreviewDialog` (tracks `previewReportId: string | null` instead of the
whole report object, same pattern as `reportCards.tsx`) — the inline
`Dialog`/`<embed>` block and its now-unused imports (`Printer`, `Button`,
`Dialog*`) were removed. Verified live: opening a favorite's card preview now
shows the file-kind switcher chip row the old inline dialog never had.
