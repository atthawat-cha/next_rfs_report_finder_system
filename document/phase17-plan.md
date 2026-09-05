# Phase 17 — UI Design System Alignment

## Context

`document/demo_page/design-system-moodboard.html` (built this session) is a style-guide reference
that mirrors `app/globals.css`'s real tokens and `document/design-system.md`'s documented
conventions exactly — it invents nothing new. Building it surfaced the fact that the *documented*
system and the *actual* app have drifted apart in several small, concrete places since Phase 15
shipped the semantic token layer. This phase closes those gaps: real bugs first, then token
consistency, then one real typography gap (Noto Sans Thai was never wired in despite the app
rendering Thai text constantly), then a documentation catch-up so `design-system.md` stops
lagging what the code actually does.

**Spec:** `document/demo_page/design-system-moodboard.html` (visual reference) +
`document/design-system.md` (the rules the moodboard mirrors).

This is a token/consistency pass, not a visual redesign — no page's layout or information
architecture changes. Every sub-phase below is a self-contained, independently verifiable change.

## Audit — measured, not assumed

A full repo grep/read pass (fonts, literal Tailwind colors standing in for tokens, radius/shadow/
badge/button/icon consistency, and the two most recent UI-touching commits) found:

**Real bugs, not just style drift:**
1. `app/[locale]/(auth)/user-management/user-list/columns.tsx:46` — the status `Badge` is
   **hardcoded to the green "success" style unconditionally**, regardless of the row's actual
   `status` value. `prisma/schema.prisma:527-531`'s `UserStatus` enum has three values
   (`ACTIVE`/`INACTIVE`/`SUSPENDED`), so a suspended or inactive user's row still shows a green
   checkmark badge reading e.g. "SUSPENDED" — the color contradicts the label it's sitting next
   to. `app/[locale]/(auth)/user-management/user-department/dep-columns.tsx:34` sits right next to
   it in the same feature area and **does** branch correctly on `is_active`, just with the same
   hardcoded literal hex classes instead of tokens — confirms this is a copy-paste-drift bug, not a
   deliberate design choice.
2. `app/[locale]/login/page.tsx:128,179` — the login/2FA error banner is
   `text-red-600 bg-red-50 border border-red-200` with **zero `dark:` variant**. In dark mode this
   renders a pale pink pill on a near-black page — a real visual defect a user hits on every failed
   login attempt, not a token-purity nitpick.

**Token/consistency drift (no functional bug, but exactly what `design-system.md` §3 tells future
work not to do):**

3. `components/shared/twoFactorSettings.tsx:156` — `text-green-600` for the "2FA enabled" icon;
   `:179`'s sibling in `components/shared/fileuploading.tsx` uses `text-emerald-500` for an
   upload-complete checkmark. Both are the same "success" meaning as `ReportStatusPill`'s
   `PUBLISHED` state, in two different literal greens, neither reusing `--success`.
4. `components/shared/fileuploading.tsx`'s `getFileIcon()` (lines 110-118, 134) **re-implements**
   file-type coloring from scratch (`blue-500` image, `red-500` pdf, `green-600` spreadsheet,
   `blue-600` word) completely independently of `fileKindMeta()`
   (`components/shared/reportDisplayMeta.tsx:40-50`), which already owns this exact mapping via the
   `pdf`/`xlsx`/`doc` tokens. The word-file case is doubly interesting: `design-system.md:39`
   already documents `doc`/`doc-bg` as "reserved — `fileKindMeta` has no `isDocxFile` detection
   yet" — this widget is the second place independently reinventing that same unfinished case.
5. Three separate, near-but-not-quite-identical "favorited" amber implementations, no shared
   constant: `reportCards.tsx:157-159` (`text-amber-500`, no dark variant),
   `favorites/components/favReportCard.tsx:116` (`text-amber-500 hover:text-amber-600`, no dark
   variant), `reportDetailView.tsx:530` (`border-amber-400/50 bg-amber-50 text-amber-600
   hover:bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400` — the only one of the three with any
   dark-mode value at all).
6. Three separate status/type badge implementations outside `reportDisplayMeta.tsx`, none reusing
   its `rounded-full` + `h-1.5 w-1.5` dot pattern: the two user-management columns above, plus
   `app/[locale]/(auth)/tickets/components/ticketBadges.tsx:5-17`, which maps ticket
   priority/status straight to shadcn `Badge`'s built-in variants with no semantic token at all —
   consequence: `RESOLVED` and `CLOSED` render **identically** (both `outline`), and nothing in the
   ticket system uses `success`/`warning` even though "resolved" is a textbook success state.
7. **No `info`-toned token exists at all.** Every other semantic meaning in the app
   (success/warning/danger/archived, three file kinds, six categories) has one; "in progress" /
   "notice" has never needed one until the ticket badges above need exactly that meaning.

**Typography gap:**

8. `app/[locale]/layout.tsx:2,11,40` loads `Inter` via `next/font/google` and applies it to
   `<body>` — that part works. **`Noto Sans Thai` is not loaded anywhere** (not in this layout, not
   in `globals.css`, not in `tailwind.config.ts`). The app renders Thai report names, department
   names, and category names constantly; today that text falls back to whatever Thai font the
   visitor's OS happens to have, not an intentional choice. The moodboard's Inter+Noto Sans Thai
   pairing (borrowed from `document/demo_page/report-detail-redesign.html`'s font stack) was never
   actually real in the shipped app.

**Checked and found already correct (no task needed):**

- Card radius: `components/ui/card.tsx:12`'s `rounded-xl` is used consistently by every report/
  favorites/category/tag card in the app — matches `design-system.md` §5 exactly.
- Table-wrapper radius: every data table in the app (`user-list`, `user-department`, `tickets`,
  `categories`, `favorites`, `report-list`, dashboard analytics, `settings/menus`,
  `user-management/activity`) consistently uses `rounded-md border` — a real, uniform convention,
  just never written down in `design-system.md` (doc gap, not a code gap — see 17g).
- No raw `<button className=...">` styled by hand anywhere — every custom button already goes
  through shadcn's `Button`.
- `reportCards.tsx:140` and `favReportCard.tsx:96` both already apply
  `shadow-sm transition-shadow hover:shadow-md` per-card, matching `design-system.md` §5's
  "rest at shadow-sm, raise to shadow-md" rule — the shared `Card` primitive itself ships a bare
  `shadow` with no built-in hover state, but every clickable consumer already adds it correctly by
  hand. See "What this phase deliberately did not touch" below for why the primitive stays as-is.
- `components/shared/sqlBlock.tsx`'s permanently-dark, line-numbered SQL panel (added in
  `b119194`, the report-detail redesign) uses literal `neutral-800/900/300/600/100` entirely
  outside the HSL token system — confirmed intentional (a code panel that stays dark regardless of
  app theme, like GitHub/VS Code's own code blocks), not a bug. It has just never been written down
  as a deliberate exception, so a future session could "fix" it into token compliance and break the
  intended look — closed in 17g.

## Resolved decisions

- **Item 1 (user status badge):** fix by branching on the real three-value `UserStatus` enum, not
  a boolean. `SUSPENDED` gets its own `warning` tone rather than being folded into `ACTIVE`/
  `INACTIVE` — it's a materially different, temporary state, and the whole reason this bug went
  unnoticed is that the badge never varied by input in the first place.
- **`INACTIVE` user / inactive department → `archived`, not `danger`.** An inactive account or
  department is dormant, not a security concern — the same "deliberately desaturated, not a
  warning color" semantic `design-system.md:36` already assigns to a report's `ARCHIVED` status.
  Reserve `danger` for what it already means elsewhere in the app (`PRIVATE` access level) rather
  than diluting it into a generic "off" indicator.
- **New shared file `components/shared/adminStatusMeta.tsx`**, not a fourth copy inside
  `reportDisplayMeta.tsx` — user/department status isn't report-related, and
  `design-system.md` §3 rule 4 already says a non-report mapping belongs in "a sibling shared
  helper," not the report-specific file.
- **New `info`/`info-bg` token, hue `205`** (a clear sky-blue): distinct enough from `cat-1`'s `213`
  and `cat-4`'s `199` that a ticket's `info`-toned badge won't read as "this ticket belongs to
  category 1/4" if a screen ever shows both badge families near each other. Follows
  `design-system.md` §4's pattern exactly (light: saturated/darker fg on a very light bg; dark:
  inverts which end is light, hue held constant).
- **New shared file `components/shared/statusPill.tsx`** (a five-tone, tone-keyed pill: success/
  warning/danger/info/archived) for `ticketBadges.tsx` to consume. **Deliberately did not** refactor
  `ReportStatusPill`/`REPORT_STATUS_STYLES` to delegate to it — that component is widely consumed
  and working correctly today; rewriting it for DRY-purity alone risks a stable path for no
  functional gain. The new primitive exists for *non-report* consumers (tickets today, whatever's
  next tomorrow), exactly the "sibling shared helper" `design-system.md` §3 already prescribes.
- **Ticket `PriorityBadge`'s two extremes (`LOW`/`CRITICAL`) stay as plain shadcn `Badge`**
  (`secondary`/`destructive`), not the new pill — `design-system.md` §5's existing rule ("never a
  solid saturated fill, that's reserved for primary/destructive actions") already explains exactly
  why `CRITICAL` earns the one solid-fill exception, and `LOW` needs no color at all. Only the two
  *meaningful-but-not-extreme* tones (`MEDIUM`→warning, `HIGH`→danger) move to the soft pill.
- **Wire up the reserved `doc`/`doc-bg` token for real**, via a new `isDocFile()` filename check
  (`.doc`/`.docx` suffix) alongside the existing `isPdfFile`/`isSpreadsheetFile` in
  `components/shared/reportFilePreview.tsx` — this was already anticipated by
  `design-system.md:39`'s own "wire it up if/when docx-specific detection is added" note, and doing
  it now is what lets `fileuploading.tsx`'s word-file icon stop hand-rolling its own blue.
- **Favorite-star treatment collapses to one shared pair of constants**, accepting the loss of
  `favReportCard.tsx`'s slightly different `hover:text-amber-600` shade — the three
  implementations' differences never carried meaning; they were drift, not intent.
- **Did not** bake `hover:shadow-md` into the shared `Card` primitive itself — `Card` is also used
  for non-clickable surfaces (dialogs, the 2FA card well, form wells), where a hover-raise would be
  actively wrong. The per-consumer pattern already in `reportCards.tsx`/`favReportCard.tsx` is
  correct; nothing to change.
- **Did not** touch icon-size variance in `reportCards.tsx` (mixes `h-2.5` through `h-6`) — real,
  but no bug, and low visual impact; deferred rather than bundled into an otherwise-focused phase.
- **Flagging, not fixing:** the `tickets` module (`app/[locale]/(auth)/tickets/`) is real,
  functioning code with no mention anywhere in `CLAUDE.md`'s domain-model description. That's a
  `CLAUDE.md` documentation gap, unrelated to design tokens — out of scope here, noted so it isn't
  lost.

---

## Sub-phase 17a — User & department status badges (real bug)

### 1. New file: `components/shared/adminStatusMeta.tsx`

```tsx
/**
 * Status -> color mappings for admin management tables (user-list,
 * user-department) that aren't report-related, so they live beside (not
 * inside) reportDisplayMeta.tsx - see document/design-system.md §3.
 */

export const USER_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-success-bg text-success",
  SUSPENDED: "bg-warning-bg text-warning",
  INACTIVE: "bg-archived-bg text-muted-foreground",
};

export function activeStatusStyles(isActive: boolean): string {
  return isActive ? "bg-success-bg text-success" : "bg-archived-bg text-muted-foreground";
}
```

### 2. `app/[locale]/(auth)/user-management/user-list/columns.tsx`

Add imports (top of file, alongside the existing `Badge` import):

```tsx
import { cn } from "@/lib/utils"
import { USER_STATUS_STYLES } from "@/components/shared/adminStatusMeta"
```

Replace the `status` column's `cell` (currently always-green, ignores `status`):

```tsx
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <div className="flex flex-wrap gap-2 ">
            <Badge
              variant="secondary"
              className={cn("gap-2 text-xs", USER_STATUS_STYLES[status] ?? USER_STATUS_STYLES.INACTIVE)}
            >
              <BadgeCheck className='text-xs w-4 h-4' data-icon="inline-start" />
                {status}
            </Badge>
            </div>
          )
        }
```

### 3. `app/[locale]/(auth)/user-management/user-department/dep-columns.tsx`

Add imports:

```tsx
import { cn } from "@/lib/utils"
import { activeStatusStyles } from "@/components/shared/adminStatusMeta"
```

Replace the `is_active` column's `cell` (same branching logic, tokens instead of literal hex):

```tsx
        cell: ({ row }) => {
          const isActive = row.original.is_active
          return (
            <div className="flex flex-wrap gap-2 ">
            <Badge variant="secondary" className={cn("gap-2 text-xs", activeStatusStyles(isActive))}>
              {isActive ? tc('active') : tc('inactive')}
            </Badge>
            </div>
          )
        }
```

### Verification (17a)
- Seed or edit one user to each of `ACTIVE`/`SUSPENDED`/`INACTIVE`, open `/user-management/user-list`
  → three visibly different badge colors (green/amber/muted), not three green badges.
- `/user-management/user-department` → toggle a department inactive → badge switches from green to
  muted (previously green→red); toggle back → green again.
- Both pages: toggle dark mode → badges keep readable contrast (tokens already have dark values).
- `npx tsc --noEmit` — 0 errors.

---

## Sub-phase 17b — Login/2FA error banner (dark-mode bug)

### 1. `app/[locale]/login/page.tsx`

Add a module-level constant right after the imports (before `function LoginContent()`):

```tsx
const ERROR_BANNER_CLASS = "p-3 text-sm text-danger bg-danger-bg border border-danger/30 rounded-md";
```

Replace both occurrences of the inline class string:

Line 128 (2FA step):
```tsx
                {error && (
                  <div className={ERROR_BANNER_CLASS}>
                    {error}
                  </div>
                )}
```

Line 179 (main login form):
```tsx
              {error && (
                <div data-testid="login-error" className={ERROR_BANNER_CLASS}>
                  {error}
                </div>
              )}
```

### Verification (17b)
- Trigger a failed login (wrong password) in light mode → red-tinted banner, readable.
- Same, in dark mode → banner is now visibly dark-mode-appropriate (soft dark-red background, light
  red text), not a pale pink box on a black page.
- Trigger the 2FA step's own error path (wrong code) the same way.
- `data-testid="login-error"` is unchanged — no test selector breakage (check `e2e`/Playwright specs
  that reference this testid, if any: `grep -rn "login-error"`).
- `npx tsc --noEmit` — 0 errors.

---

## Sub-phase 17c — Unify the favorite-star treatment

### 1. `components/shared/reportDisplayMeta.tsx`

Add near the top, after the existing `REPORT_STATUS_STYLES` block:

```tsx
/** Single source for the "favorited" amber treatment - previously three
 * independent, slightly different implementations across reportCards.tsx,
 * favReportCard.tsx, and reportDetailView.tsx (see document/design-system.md,
 * Phase 17). */
export const FAVORITE_ICON_ACTIVE_CLASS = "text-amber-500 dark:text-amber-400";
export const FAVORITE_ICON_IDLE_CLASS =
  "text-muted-foreground hover:text-amber-500 dark:hover:text-amber-400";
export const FAVORITE_BUTTON_ACTIVE_CLASS =
  "border-amber-400/50 bg-amber-50 text-amber-600 hover:bg-amber-50 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-400";
```

### 2. `app/[locale]/(auth)/reports/report-list/components/reportCards.tsx`

Import the new constants alongside the existing `reportDisplayMeta` imports, then replace the
star button's `className` (around line 157-160):

```tsx
                                        <button
                                            type="button"
                                            onClick={() => handleToggleFavorite(report)}
                                            aria-label={isFav ? tf("removeFromFavorites") : tl("columns.addToFavorites")}
                                            className={cn(
                                                "rounded-full p-0.5 transition-colors",
                                                isFav ? FAVORITE_ICON_ACTIVE_CLASS : FAVORITE_ICON_IDLE_CLASS
                                            )}
                                        >
```

### 3. `app/[locale]/(auth)/reports/favorites/components/favReportCard.tsx`

Replace the star button's `className` (around line 116):

```tsx
                                    <button
                                        type="button"
                                        onClick={() => report.id && onUnfavorite(report.id)}
                                        aria-label={tf("removeFromFavorites")}
                                        className={cn("shrink-0 rounded-full p-0.5", FAVORITE_ICON_ACTIVE_CLASS)}
                                    >
```

### 4. `app/[locale]/(auth)/reports/report-detail/[id]/components/reportDetailView.tsx`

Replace the favorite button's conditional class (around line 528-531):

```tsx
                <Button
                  variant="outline"
                  className={cn("w-full justify-center", isFavorited && FAVORITE_BUTTON_ACTIVE_CLASS)}
                  disabled={favBusy}
                  onClick={handleToggleFavorite}
                >
```

### Verification (17c)
- `/reports/report-list`: hover a non-favorited report's star → amber preview; click → stays amber
  (filled); toggle dark mode → still amber, still readable (was previously un-themed for dark).
- `/reports/favorites`: every card's star renders the same shade as report-list's active state now
  (previously a slightly different hover shade).
- `/reports/report-detail/[id]`: the "Add/Remove favorite" button's active (favorited) state renders
  identically to before in light mode, and now has a proper dark-mode border (previously missing).
- `npx tsc --noEmit` — 0 errors.

---

## Sub-phase 17d — File-upload & 2FA icon colors (token reuse + wiring up `doc`)

### 1. `components/shared/reportFilePreview.tsx`

Add a third file-kind check alongside the existing two:

```tsx
export function isDocFile(file: Pick<ReportFilePreviewFile, "file_name">): boolean {
  const name = file.file_name?.toLowerCase() ?? "";
  return name.endsWith(".doc") || name.endsWith(".docx");
}
```

### 2. `components/shared/reportDisplayMeta.tsx`

Update the import and `fileKindMeta()` to use it, and add an `iconClassName` field (separate from
`badgeClassName`, since a bare icon glyph shouldn't carry a background color):

```tsx
import { isPdfFile, isSpreadsheetFile, isDocFile } from "@/components/shared/reportFilePreview";

export interface FileKindMeta {
  ext: string;
  Icon: LucideIcon;
  iconClassName: string;
  badgeClassName: string;
}

export function fileKindMeta(file: { file_name?: string | null }): FileKindMeta {
  const ref = { file_name: file.file_name ?? "" };
  if (isPdfFile(ref)) {
    return { ext: "PDF", Icon: FileText, iconClassName: "text-pdf", badgeClassName: "bg-pdf-bg text-pdf" };
  }
  if (isSpreadsheetFile(ref)) {
    return { ext: "XLSX", Icon: FileSpreadsheet, iconClassName: "text-xlsx", badgeClassName: "bg-xlsx-bg text-xlsx" };
  }
  if (isDocFile(ref)) {
    return { ext: "DOC", Icon: FileText, iconClassName: "text-doc", badgeClassName: "bg-doc-bg text-doc" };
  }
  const ext = file.file_name?.split(".").pop()?.toUpperCase() ?? "";
  return { ext: ext || "FILE", Icon: FileIcon, iconClassName: "text-muted-foreground", badgeClassName: "bg-muted text-muted-foreground" };
}
```

(Any existing consumer of `fileKindMeta()` that destructures `{ ext, Icon, badgeClassName }` keeps
compiling unchanged — `iconClassName` is additive.)

### 3. `components/shared/fileuploading.tsx`

Replace the hand-rolled `getFileIcon()` (lines 110-119):

```tsx
function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
  const { Icon, iconClassName } = fileKindMeta({ file_name: file.name });
  return <Icon className={cn("h-5 w-5", iconClassName)} />;
}
```

Add the import: `import { fileKindMeta } from "@/components/shared/reportDisplayMeta";`
(`cn` is already imported in this file.)

Update `ImagePreview`'s fallback icon (line 134) to match the same neutral treatment:

```tsx
  if (!src) return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
```

Update the upload-complete checkmark (line 179):

```tsx
      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
```

### 4. `components/shared/twoFactorSettings.tsx`

Line 156:

```tsx
        {enabled ? <ShieldCheck className="h-5 w-5 text-success" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
```

### Verification (17d)
- Open the report upload dialog, add a `.pdf`, `.xlsx`, and `.docx` file → three visibly distinct
  icon colors (red/green/blue-ish, matching `pdf`/`xlsx`/`doc` tokens), not the old hand-rolled
  hues — confirm the colors match the same file's badge elsewhere (e.g. that PDF's icon color here
  equals `fileKindMeta`'s PDF badge color used in report cards).
- Add a `.png`/`.jpg` → neutral (muted) icon, not blue.
- Complete an upload → checkmark renders in the same green as `ReportStatusPill`'s `PUBLISHED`
  state, in both light and dark mode.
- `/profile` (2FA section): enabled state icon matches the same green.
- `npx tsc --noEmit` — 0 errors.

---

## Sub-phase 17e — New `info` token + shared `StatusPill` + ticket badges

### 1. `app/globals.css`

In `:root`, insert after `--danger-bg` (before `--archived-bg`):

```css
    --info: 205 82% 38%;
    --info-bg: 205 82% 94%;
```

In `.dark`, insert after `--danger-bg` (before `--archived-bg`):

```css
    --info: 205 78% 66%;
    --info-bg: 205 45% 15%;
```

### 2. `tailwind.config.ts`

In `theme.extend.colors`, insert after the `danger` block (before `archived`):

```ts
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				bg: 'hsl(var(--info-bg))'
  			},
```

### 3. New file: `components/shared/statusPill.tsx`

```tsx
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "archived";

export const STATUS_TONE_STYLES: Record<StatusTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  archived: "bg-archived-bg text-muted-foreground",
};

/**
 * Domain-agnostic version of reportDisplayMeta.tsx's ReportStatusPill, for
 * non-report status badges (tickets today) - see document/design-system.md §3
 * ("a sibling shared helper, if the mapping isn't report-related").
 * ReportStatusPill itself is intentionally left as-is, not refactored to
 * delegate here - see document/phase17-plan.md's Resolved decisions.
 */
export function StatusPill({
  tone,
  label,
  className,
}: {
  tone: StatusTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        STATUS_TONE_STYLES[tone],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
```

### 4. `app/[locale]/(auth)/tickets/components/ticketBadges.tsx`

Replace the whole file:

```tsx
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { StatusPill, type StatusTone } from '@/components/shared/statusPill';
import type { TicketPriority, TicketStatus } from './ticketTypes';

const STATUS_TONE: Record<TicketStatus, StatusTone> = {
    OPEN: 'warning',
    IN_PROGRESS: 'info',
    RESOLVED: 'success',
    CLOSED: 'archived',
};

// Only the two meaningful-but-not-extreme priorities get a soft pill; LOW and
// CRITICAL stay plain shadcn Badge variants - see document/design-system.md §5
// ("never a solid fill except primary/destructive") and phase17-plan.md.
const PRIORITY_TONE: Partial<Record<TicketPriority, StatusTone>> = {
    MEDIUM: 'warning',
    HIGH: 'danger',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
    const t = useTranslations('tickets.status');
    return <StatusPill tone={STATUS_TONE[status]} label={t(status)} />;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
    const t = useTranslations('tickets.priority');
    if (priority === 'LOW') return <Badge variant="secondary">{t(priority)}</Badge>;
    if (priority === 'CRITICAL') return <Badge variant="destructive">{t(priority)}</Badge>;
    return <StatusPill tone={PRIORITY_TONE[priority]!} label={t(priority)} />;
}
```

### Verification (17e)
- `/tickets`: a `RESOLVED` ticket and a `CLOSED` ticket now render **visibly different** badges
  (green vs muted) — previously identical (`outline`/`outline`).
- An `IN_PROGRESS` ticket renders in the new blue `info` tone; `OPEN` renders `warning` (amber).
- Priority column: `LOW` stays a plain gray badge, `MEDIUM` amber pill, `HIGH` red pill, `CRITICAL`
  stays the solid destructive badge — four visibly distinct treatments (previously LOW/HIGH shared
  no particular emphasis logic and MEDIUM/CRITICAL didn't clearly escalate).
- Toggle dark mode on `/tickets` → all five tones (success/warning/danger/info/archived) stay
  readable.
- `npx tsc --noEmit` — 0 errors (confirms `StatusTone`/`TicketStatus`/`TicketPriority` line up).

---

## Sub-phase 17f — Typography: wire in Noto Sans Thai

### 1. `app/[locale]/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import "../globals.css";
import { ThemeProvider } from "@/components/provider/themeProvider";
import { Toaster } from "react-hot-toast";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-thai",
});
```

Replace the `<body>` tag:

```tsx
      <body className={cn(inter.variable, notoSansThai.variable, "font-sans")}>
```

### 2. `tailwind.config.ts`

In `theme.extend`, add a `fontFamily` block (alongside `colors`/`borderRadius`):

```ts
  		fontFamily: {
  			sans: ['var(--font-inter)', 'var(--font-noto-thai)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  		},
```

### Verification (17f)
- With the dev server already running (per `CLAUDE.md`: do **not** run a parallel `next build`
  while `next dev` is up on this machine), reload any page with Thai text — `/reports/report-list`,
  `/reports/categories` — and visually confirm the Thai glyphs render from Noto Sans Thai (compare
  letterforms against the current OS-fallback rendering; a quick way to tell is checking computed
  `font-family` in devtools on a Thai text node).
- English text (headings, buttons) still renders in Inter, unchanged.
- `npx tsc --noEmit` — 0 errors.
- Only once the dev server is stopped: `npm run build` — exits 0 (confirms `next/font`'s Google
  Fonts fetch at build time succeeds; this is the one change in this phase with real build-time
  risk, since it fetches a new font family).

---

## Sub-phase 17g — Documentation catch-up (`document/design-system.md`)

No app code changes — this sub-phase only updates the doc so it stops lagging what 17a-17f just
made true. Do this last, after 17a-17f are implemented, so the doc describes the real end state.

### 1. Section 2 table — add the `info` row, update the `pdf`/`xlsx`/`doc` row

Add a row:

```markdown
| `info` / `info-bg` | Ticket status: In Progress | `StatusPill` (`statusPill.tsx`) |
```

Update the existing `doc` / `doc-bg` row (remove the "reserved" caveat now that 17d wires it up):

```markdown
| `doc` / `doc-bg` | File-type badge: Word/docx | `fileKindMeta` (via `isDocFile`, `reportFilePreview.tsx`) |
```

### 2. Section 5 (Component conventions) — add three bullets

```markdown
- **Table wrapper** — `rounded-md border`, consistently across every data table in the app
  (user-list, user-department, tickets, categories, favorites, report-list, dashboard analytics,
  settings/menus, user-management/activity). A second, deliberate radius convention alongside
  `rounded-xl` cards — not a mistake, just previously undocumented (Phase 17).
- **Non-report status badges** — use `components/shared/statusPill.tsx`'s `StatusPill`, not a new
  ad hoc `Badge` variant mapping. `ReportStatusPill` (`reportDisplayMeta.tsx`) stays the
  report-specific equivalent; the two are intentionally separate (Phase 17).
- **Favorite/star treatment** — always `FAVORITE_ICON_ACTIVE_CLASS`/`FAVORITE_ICON_IDLE_CLASS`/
  `FAVORITE_BUTTON_ACTIVE_CLASS` from `reportDisplayMeta.tsx`, never a new literal amber value
  (Phase 17).
```

### 3. New section — Typography

Insert as a new "## 7. Typography (added Phase 17)", after section 6:

```markdown
## 7. Typography (added Phase 17)

`app/[locale]/layout.tsx` loads `Inter` (Latin) and `Noto Sans Thai` (Thai + Latin) via
`next/font/google`, exposed as CSS variables (`--font-inter`/`--font-noto-thai`) and wired into
Tailwind's `font-sans` via `tailwind.config.ts`'s `theme.extend.fontFamily.sans`. Every element
using the default sans stack (i.e. not opting into a monospace class) gets both, in that order —
Thai text automatically falls through to Noto Sans Thai since Inter has no Thai glyphs. Don't
import a font directly in a component; add weights/subsets to the two font declarations in
`app/[locale]/layout.tsx` if a new one is needed.

**Exception:** `components/shared/sqlBlock.tsx`'s SQL preview panel is a permanently-dark code
block (like GitHub/VS Code's own) using literal neutral grays outside the HSL token system by
design — it does not follow the light/dark token rules in section 4, and that's intentional, not a
bug to "fix" into compliance.
```

### Verification (17g)
- Read the updated `design-system.md` top to bottom once — confirm it doesn't contradict anything
  17a-17f actually shipped (token names, file names, exact class strings all match).
- No code/test verification needed — doc-only change.

---

## Overall Definition of Done (all sub-phases)

- `npx tsc --noEmit` — 0 errors (matches the project's standing 0-error baseline).
- `npx eslint .` — 0 errors, warnings not worse than the current baseline (`document/00-progress.md`
  §11 tracks the exact ratcheted number — check it before this phase, confirm unchanged after).
- `npm test` — all existing suites still pass (no test touches these files today, so this should be
  a no-op, but confirms nothing else broke).
- Manually walk every "Verification" list above against the running dev server — this phase is
  entirely visual/token changes, so `tsc`/`eslint` passing does **not** substitute for actually
  looking at the pages.
- Update `document/00-progress.md` (flip Phase 17's row, refresh the header/HEAD/"ตอนนี้อยู่ตรงไหน"
  section) and `document/feature-list.md` if any row it touches changes status — per `CLAUDE.md`'s
  Definition of Done §5, once 17a-17g are actually implemented and committed (not as part of this
  plan-only commit).
