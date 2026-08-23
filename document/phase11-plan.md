# Phase 11 — i18n Infrastructure + English-default Locale Switching

## Context

Phase 9 (`phase9-plan.md`) deliberately scoped **out** real i18n: "this phase does not add
multi-language switching. No `next-intl`, no `[locale]` routing, no `proxy.ts` change." It narrowed
to a one-time content-string sweep standardizing everything to Thai, on the reasoning that the org
(`mfu.ac.th`) and most existing labels were already Thai, and `document/requrisement.md` never
stated a multi-language requirement.

The user has now explicitly asked for the opposite direction: **English as the default language**,
with the system **restructured to support real translation/language switching** — i.e. exactly the
work Phase 9 deferred. This phase (11) does that deferred work. It supersedes Phase 9's remaining
sub-phases (9d/9e/9f): instead of hardcoding more Thai strings inline, all remaining string work
now flows through an i18n dictionary, and Phase 9a/9b/9c's already-Thai content gets converted into
dictionary entries rather than staying inline.

## Research findings (2026-08-23, this session)

Three research passes into the actual codebase (not assumed from training data, per this project's
own "this is NOT the Next.js you know" rule) confirmed:

- Next.js **16.3.1**, App Router only, **no** i18n library installed. Next's own bundled docs
  (`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`) recommend `next-intl`
  by name for this exact version and describe `[locale]` segment + Proxy-based routing as the
  native App Router pattern — this is the version's own documented guidance, not an assumption.
- `proxy.ts` (Next 16's renamed `middleware.ts`, now **Node runtime**, not Edge) does hardcoded,
  unprefixed path comparisons (`publicPaths = ['/login', '/']`, redirects to `/login`/`/dashboard`)
  — the single highest-risk file for this migration, and one `CLAUDE.md` already names for "extra
  care."
- `lib/auth.ts` is 100% locale-agnostic (cookie-based, no path logic) — **no changes needed there**.
- `ContentLayout`'s `title` prop is plain visible `<h1>` text (not real page `<title>` metadata) —
  28+ call sites just need their literal strings swapped for translation lookups; no structural
  change to the component itself.
- `lib/menu-list.ts` (sidebar) holds ~20 hardcoded labels/hrefs — labels become translation keys;
  hrefs stay locale-agnostic (unprefixed), since the render site (the `Link` component) handles
  locale-prefixing.
- Root `app/layout.tsx` hardcodes `<html lang="th">` and is the one existing provider-composition
  point (`ThemeProvider`) — models where `NextIntlClientProvider` slots in.
- `/shares/[token]` is a public, previously-issued-link page (Phase 5e already found it fragile to
  path changes) — it must **not** move under `[locale]`, to avoid breaking any link already sent.

## Resolved decisions (user, 2026-08-23)

- Library/routing: **next-intl**, with a `[locale]` URL segment.
- Scope: build the **whole system's** i18n infrastructure now, not a 1-2 page pilot.
- Existing Thai text from Phase 9a/9b/9c: **convert into `th.json` dictionary values** (reuse
  verbatim, don't retranslate); `en.json` becomes the new primary/default dictionary (recovering
  pre-translation English from git history where useful, writing fresh English elsewhere).
- **URL prefix: `localePrefix: "as-needed"`** — English (default) keeps today's unprefixed URLs
  (`/dashboard`, `/reports/report-list`, ...) exactly as-is; only Thai gets a `/th` prefix
  (`/th/dashboard`). Chosen over prefixing both locales because it doesn't invalidate any existing
  bookmark, DB-stored notification link, or the `/shares/[token]` link format.
- **First-visit behavior: always English until the user manually switches** — next-intl's
  `localeDetection` (Accept-Language sniffing) is **disabled**. The only two locale signals are the
  URL prefix and the `NEXT_LOCALE` cookie set when the user explicitly switches.

## Sub-phases

One plan doc (this one), then one commit per sub-phase, each with its own tsc/eslint/test/build +
live-verification pass before moving on — matching every prior phase in this repo.

### 11a — Core infrastructure (routing, proxy, providers) + first thin translation slice

**Install & config**
- `npm install next-intl`.
- `i18n/routing.ts` — `defineRouting({ locales: ['en', 'th'], defaultLocale: 'en', localePrefix: 'as-needed', localeDetection: false })`.
- `i18n/navigation.ts` — `createNavigation(routing)`, re-exporting locale-aware `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`.
- `i18n/request.ts` — `getRequestConfig`, loads and merges the per-domain message files for the resolved locale.
- `next.config.js` — wrap `module.exports = nextConfig` with `createNextIntlPlugin('./i18n/request.ts')(nextConfig)`, keeping the file CommonJS, preserving every existing key (headers/images/experimental) unchanged.
- Verify the exact next-intl API surface against the actually-installed version's own README/types once `npm install` completes — don't assume the API shape from training data.

**Message files** — namespaced JSON per locale, merged by `i18n/request.ts`:
```
messages/en/{common,nav,auth,dashboard,reports,reportEditor,userManagement,roleManagement,settings,tickets}.json
messages/th/{common,nav,auth,dashboard,reports,reportEditor,userManagement,roleManagement,settings,tickets}.json
```
11a only stands up `common.json`, `nav.json`, `auth.json` for both locales — the rest populate in 11b/11c.

**Route restructuring**
- Move under `app/[locale]/`: `app/(auth)/**` (wholesale), `app/login/**`, `app/page.tsx`.
- New `app/[locale]/layout.tsx` becomes the de facto root layout for the locale tree: `<html lang={locale}>`, `NextIntlClientProvider`, existing `ThemeProvider`/`Toaster`/font setup moved down from the old `app/layout.tsx`. Add `generateStaticParams` returning both locales; reject unknown locales via `notFound()`.
- Delete the old `app/layout.tsx` content; per Next.js's "multiple root layouts" support, `app/shares/[token]/` becomes its own sibling top-level root (new `app/shares/[token]/layout.tsx`, static `<html lang="en">`, no next-intl — keeps this route's URL/behavior unchanged).
- `app/api/**` and `app/generated/**` stay exactly where they are.

**`proxy.ts` rewrite** (highest risk — same "extra care" bar Phase 8a used for this exact file):
- Compose next-intl's `createMiddleware(routing)` with the existing auth-gate logic inside the single exported `proxy()` (Next 16 allows only one `proxy.ts`/one exported `proxy`).
- Strip a leading `/th` segment before comparing against `publicPaths`/`'/login'`; build redirect targets through next-intl's locale-aware path helpers so a Thai-session user stays in Thai after a redirect.
- Update `matcher` to exclude `/shares` (now unlocalized) too; drop the dead `'/app/:path*'` entry (matches nothing real, pre-existing cruft, safe to clean up while the file is being rewritten anyway).
- Full manual re-verification mirroring Phase 8a's bar: unauthenticated → locale-correct `/login`; authenticated hitting `/login` → locale-correct `/dashboard`; `/shares/[token]` bypass still works and stays unprefixed; locale switch preserves auth/session; matcher exclusions still correct.

**Locale-aware navigation sweep** (within the `[locale]` tree only)
- Swap `next/link`'s `Link`, `next/navigation`'s `useRouter`/`usePathname`, and Server Component `redirect()` calls to the locale-aware equivalents from `@/i18n/navigation` — ~20 files (the ~40 `Link href="/..."` + ~9 `router.push` + ~5 `redirect()` call sites found in research).
- `docTab.tsx`'s `window.location.origin` share-link builder needs no change (origin has no path).
- `notification-bell.tsx`'s `router.push(n.link)` (DB-stored, unprefixed) — swap to the locale-aware `useRouter`; an unprefixed stored link still resolves correctly as the default/English path under `as-needed`, so no DB migration needed — flagged as a known edge case for 11d.

**First thin translation slice** (proves the pipeline end-to-end)
- `lib/menu-list.ts`: `groupLabel`/`label` → translation keys under `nav.json`; hrefs stay unprefixed.
- `components/layouts/navbar.tsx`, `sheet-menu.tsx`: wired through `useTranslations('nav'/'common')`.
- `app/[locale]/login/page.tsx`: full translation (public, string-heavy, exercises the proxy rewrite too).
- 2-3 representative `ContentLayout title="..."` call sites as a pattern proof — the remaining ~24 are 11b's job.
- New `LocaleSwitcher` client component next to `ModeToggle` in `navbar.tsx`, using `useLocale()` + locale-aware `usePathname`/`useRouter`; sets the `NEXT_LOCALE` cookie on switch (next-intl's own convention — not the zustand/localStorage `useSidebar` pattern, since the locale must resolve server-side before any client JS runs).

**Verification (11a)**: tsc 0 errors, eslint 0 warnings, tests green, curl smoke tests for `/` (English, unprefixed) and `/th` (Thai) across representative pages plus unauthenticated redirects and `/shares/[token]` reachability. Flag to the user that a real browser check of the switcher + auth redirects is needed (no browser tool this session, fully client-rendered app — a documented blind spot already responsible for one missed bug in Phase 10).

### 11b — Migrate shared chrome + non-reports admin pages

- Convert the remaining ~24 `ContentLayout title="..."` call sites (dashboard, blank, permissions, profile, `settings/{general,storage,menus}`, `tickets/{page,manage}`, `user-management/{activity,user-department,user-form,user-list}`, `role-management/{manage,role-form,roles}`).
- Convert remaining hardcoded strings in `components/layouts/*` (`user-nav.tsx`, `notification-bell.tsx`, `sidebar.tsx`) and any `components/shared/*` not already covered by reports-domain work.
- Populate `messages/{en,th}/{dashboard,settings,tickets,userManagement,roleManagement,common}.json`, reusing Phase 9a's committed Thai as `th.json` values, writing/recovering English for `en.json`.
- Note in `phase9-plan.md` that 9d/9e/9f are superseded by this sub-phase.

### 11c — Migrate the reports domain

- Convert every reports-domain page/component Phase 9a/9b/9c hardcoded to Thai: `report-list`, `report-create`, `report-edit` + every `components/reportEditor/*` tab, `report-detail`, `favorites`, `categories`, `tags`, plus reached shared components (`reportPermissionsDrawer`, `reportPreviewDialog`, `searchInput`, `dataTable`, `sqlBlock`, `breadcrumb`, `permissions-form`).
- `messages/th/{reports,reportEditor}.json` gets the exact Thai strings already committed in `b6b8ccd`/`87a9d4b` verbatim. `messages/en/{reports,reportEditor}.json` recovers pre-translation English via `git show <pre-9b/9c-commit>^:<path>` where useful, fresh English elsewhere.
- Fix `breadcrumb.tsx`'s known pre-existing bug (hardcodes the same 3-string trail regardless of which of its 10 importing pages renders it) while it's being touched anyway.

### 11d — Final sweep, dynamic formatting, verification, docs

- Fix hardcoded `toLocaleString('th-TH')` (`DashboardAnalytics.tsx` x6, `user-management/activity/page.tsx` x2) to use `useLocale()` dynamically.
- Grep sweep for anything missed by 11b/11c.
- Full verification bar (tsc/eslint/test/build with dev server stopped first) + curl smoke tests across both locales + explicit ask for a manual browser pass on the switcher and both auth-redirect directions in each locale.
- Update `document/00-progress.md`, `document/feature-list.md`'s i18n row, and `phase9-plan.md`'s pointer.

## Verification checklist (applies per sub-phase)

1. `npx tsc --noEmit` → 0 errors.
2. `npx eslint .` → 0 warnings.
3. `npm test` → all green (baseline 37/37, no expected count change).
4. Curl smoke tests: `/`, `/th`, `/dashboard`, `/th/dashboard`, `/login`, `/th/login`, `/shares/[token]` unauthenticated — confirm correct redirects/200s per locale.
5. `npm run build` only after confirming the dev server on :3501 is stopped.
6. Explicit flag to the user for manual browser verification of the `LocaleSwitcher` and both auth-redirect directions per locale.
7. Commit per sub-phase (`feat: Phase 11a - ...` etc.), then a `document/00-progress.md` update commit.
