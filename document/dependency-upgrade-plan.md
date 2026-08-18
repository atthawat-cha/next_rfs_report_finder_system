# Dependency Upgrade Plan — next / react / sharp / postcss

## Context

Phase 4f (`document/phase4-plan.md` 4f#2) stood up this repo's first-ever CI pipeline and ran `npm audit --audit-level=high` for real for the first time. It surfaced pre-existing high/critical advisories unrelated to that task — logged as `document/00-progress.md` ของค้าง #6 — and the audit step was set to `continue-on-error: true` so CI could go green without silently hiding the finding. This document is the deliberate upgrade plan promised there, researched via two parallel investigations (2026-08-18): one into the official Next.js/React/sharp/postcss upgrade paths and breaking changes, one auditing this specific codebase for exactly what would break.

**The advisories, restated with corrected scope** (the postcss framing in ของค้าง #6 was partially wrong — see Stage 0):
- `next@14.2.18` — critical, a large accumulated set of CVEs across many point releases (DoS via Server Actions/Server Components, cache poisoning, middleware auth bypass, SSRF via rewrites, XSS in `beforeInteractive` scripts, HTTP request smuggling in rewrites, etc.)
- top-level `postcss@8.4.33` (devDependency) — high, **this is not purely "bundled inside next" as first assumed** — 8.4.33 predates both `GHSA-qx2v-qp2m-jg93` (fixed 8.5.10) and `GHSA-6g55-p6wh-862q`/CVE-2026-45623 (fixed 8.5.12). Next also bundles its own nested, separately-vulnerable copy of postcss, but that copy can only be fixed by upgrading `next` itself.
- `sharp@0.34.5` — high, `CVE-2026-33327/33328/35590/35591` (libvips), fixed in `sharp@0.35.x`

## Audit findings

### Version gap

| Package | Current | Latest stable (2026-08-18) |
|---|---|---|
| `next` | 14.2.18 | 16.3.1 |
| `react` / `react-dom` | 18.3.1 | 19.2.8 |
| `sharp` | 0.34.5 | 0.35.3 |
| `postcss` (top-level) | 8.4.33 | 8.5.26 |

Next 15 shipped Oct 2024, Next 16 shipped Oct 2025 — Next 14 is two majors and ~2 years behind. **Next's own docs only publish sequential single-major upgrade guides (14→15, 15→16), not a direct 14→16 path** — going stepwise is the documented, lower-risk route, not just a cautious default.

### Codebase impact (full audit in the research transcript, summarized here)

- **31 route-handler functions across 16 files** under `app/api/**` use the Next-14 synchronous `{ params }: { params: { id: string } }` pattern and must become `{ params }: { params: Promise<{ id: string }> }` + `await params`. Style is 100% consistent across the codebase (always `req: NextRequest, { params }: {...}`, never a `context` object) — a scripted/codemod pass should cover nearly all of it uniformly. Full file list is in the research transcript; representative files: `app/api/reports/[id]/route.ts`, `app/api/reports/[id]/files/[fileId]/download/route.ts`, `app/api/shares/[token]/route.ts`, plus every `report_*` sub-resource route (queries/variables/permissions/shares/versions/files).
- **Two stub dynamic routes** (`app/api/users/departments/[id]/route.ts`, `app/api/users/roles/[id]/route.ts`) don't destructure `params` at all (`return Response.json({ message: "Hello World" })`) — no change needed now, but write them async-style from day one whenever they're actually implemented.
- **Zero server components read `params`/`searchParams` as props.** The two dynamic page routes (`report-edit/[id]/page.tsx`, `shares/[token]/page.tsx`) are both `"use client"` and read the segment via `useParams()`; all `searchParams` usage is via the client `useSearchParams()` hook. **This entire category of the Next 15 migration — normally one of the biggest — requires zero work here.**
- **`cookies()` is the only `next/headers` API used anywhere** (`lib/auth.ts`, 3 call sites) and **all three are already `await`ed**. Zero work needed. `headers()` is never called at all.
- **No Server Actions** (`'use server'`) anywhere in the codebase.
- **No server-side `fetch()` to external URLs** anywhere — the caching-default change in Next 15 has nothing to bite.
- **`next.config.js`** is small: `reactStrictMode`, one experimental flag (`experimental.optimizePackageImports: ['lodash']` — graduates to stable in 15, verify it's still honored or move out of `experimental`), `images: { unoptimized: true, remotePatterns: [...] }`, and the Phase 4a security-headers `headers()` block. No custom `webpack` config exists (confirmed) — lowers risk of the Next 16 Turbopack-default switch.
- **`middleware.ts`** is a single exported `middleware()` function, `matcher` config, reads the session cookie directly off `request.cookies` (not via `next/headers`), and does JWT verification via `jose` — already Edge-runtime-safe by construction (this is exactly why `lib/logger.ts`/`lib/rate-limit.ts` had to be kept out of `lib/auth.ts` per Phase 4d/4f's own notes).
- No parallel routes (`@slot` folders), no AMP, no `revalidateTag(` usage anywhere.

### The two decisions this plan can't make for you

1. **`middleware.ts` → `proxy.ts` at the Next 16 hop.** Next 16 deprecates `middleware.ts` in favor of `proxy.ts` — but `proxy.ts` **always runs on the Node.js runtime, with no Edge option** ("If you want to continue using the `edge` runtime, keep using `middleware.ts`"). This cuts both ways for this specific codebase:
   - *Staying on legacy `middleware.ts`* keeps today's Edge-runtime behavior unchanged — lowest-risk choice, but keeps the Edge-runtime constraint that has already caused friction twice (pino couldn't be imported into `lib/auth.ts` in 4f; `ioredis` couldn't either, going back further).
   - *Migrating to `proxy.ts`* moves auth-checking middleware onto the Node.js runtime — which would **remove** that constraint entirely (structured logging and Redis-backed checks could then live directly in the file middleware imports from, if ever wanted), at the cost of adopting a not-yet-fully-proven-in-this-app runtime for something as security-critical as the auth gate. This needs deliberate before/after testing either way, not a default pick.
2. **Turbopack as the Next 16 default bundler.** No custom `webpack` config exists today, which makes this low-risk, but "low-risk" isn't "zero-risk" for a `next build` that CI now depends on — it needs an actual green `next build` run under Turbopack before landing, with `--webpack` as the explicit fallback if something doesn't compile.

Both are called out as open decisions in the stage plans below rather than resolved here.

## Staged plan

Four stages, ordered so the low-risk/high-value ones ship immediately and the highest-blast-radius one (the actual Next major bumps) gets its own isolated, fully-verified pass — matching this repo's existing convention of small independently-shippable commits (`feat: Phase Xy - ...`) rather than one giant PR.

### Stage 0 — postcss patch bump (independent, no Next.js involvement, do first)

Bump the top-level `postcss` devDependency from `^8.4.33` to `^8.5.26` (or at minimum `^8.5.12` to clear both advisories). This is a **patch-range bump within postcss 8.x** — no major version change, no API surface change for a project that only touches postcss through `tailwindcss`/`autoprefixer`'s plugin interface via `postcss.config.js`. `tailwindcss@^3.4.1` and `autoprefixer@^10.4.17` both declare wide `postcss ^8.x` peer ranges, so this shouldn't cascade into needing a Tailwind bump too.

Note this does **not** close the postcss advisory that's nested inside `next`'s own `node_modules/next/node_modules/postcss` — that copy is only fixed by the Stage 2/3 Next upgrade. Stage 0 closes the top-level-devDependency instance of the same class of advisory, which is real and independently worth fixing regardless of the Next timeline.

**Files**: `package.json`, `package-lock.json`

**Verification**: `npm install`, `npx tsc --noEmit` (no new errors vs the then-current baseline), `npm run build` succeeds, visually spot-check a Tailwind-heavy page (e.g. dashboard) renders identically, `npm audit` no longer lists the two postcss CVEs.

### Stage 1 — sharp 0.34 → 0.35 (independent, low-moderate risk, do early)

Bump `sharp` from `^0.34.5` to `^0.35.3`. Requires Node ≥20.9.0 — already satisfied (`node -v` confirms 20.20.0 on this dev machine). Two things to actually verify rather than assume:

1. **Windows binary resolution** — sharp 0.35 removed its postinstall `install` script and now relies purely on npm's platform-specific optional-dependency resolution (`@img/sharp-win32-x64` etc.). On a normal 64-bit Windows box this should resolve automatically, but it's a bigger deal than a typical patch bump and needs an actual clean-install test, not just a version-number bump. (`win32-ia32`/32-bit Windows is separately marked deprecated — confirm no dev machine runs 32-bit Node, though this is very unlikely today.)
2. **`limitInputChannels` now defaults to 5** (previously unlimited) and `failOnError`/`paletteBitDepth` were removed as constructor options. Check `lib/imageConvert.ts` doesn't rely on any of these — a quick grep, not a rewrite, since this module doesn't appear to use them based on the 4c/4f-era code already reviewed in this repo.

**Files**: `package.json`, `package-lock.json`, possibly `lib/imageConvert.ts` if it turns out to touch the removed options (expected: no change needed)

**Verification**: `rm -rf node_modules && npm install` (clean install, not incremental — to actually exercise the new binary-resolution path) → confirm `sharp` loads without error → exercise a real image upload through `lib/fileUploadServices.ts` end-to-end (upload → WebP conversion → file written to `public/`) and confirm the output file opens correctly and looks visually unchanged from a pre-upgrade sample.

### Stage 2 — Next 14 → 15 + React 18 → 19 (the big one, do as its own isolated pass)

**React 19 is not optional for this hop** — the App Router requires React 19 starting at Next 15 (Next 15's React-18 compatibility path is Pages-Router-only, irrelevant to this 100%-App-Router codebase). This bundles the React major bump into the same stage as the Next major bump; they can't be separated.

1. **Isolate the work**: new branch off `feature/phase4` (or `main`, whichever this has merged into by the time this is picked up), dev server fully stopped first (per CLAUDE.md's `.next` corruption warning — this is exactly the kind of change that warrants a clean stop/restart cycle, not a background dev server left running).
2. **Run the async-APIs codemod**: `npx @next/codemod@latest next-async-request-api .` (targeted codemod, not the full `upgrade` orchestrator, to keep this stage's diff scoped to exactly the params/cookies/headers change) against all 16 affected route-handler files. Review the diff — expect it to mechanically convert all 31 handler signatures to `{ params }: { params: Promise<{ ... }> }` + inject `await params` at the top of each function body.
3. **Bump versions**: `next@^15`, `react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19`, `eslint-config-next@^15`. Leave `eslint@^8.56.0` alone at this stage (ESLint 9 migration is a Stage 3 concern, tied to `next lint`'s removal in 16, not required by 15).
4. **Check `experimental.optimizePackageImports`** in `next.config.js` — Next 15 graduated this flag to stable with an expanded default package list; confirm it's still honored under the `experimental` key or move it if the 15 upgrade guide says otherwise at the time this is executed (guides can shift between minor releases — re-check the live docs, don't trust this plan doc's phrasing as gospel by the time this is implemented).
5. **New caching defaults to actually exercise, not just read about**: `fetch()` is no longer cached by default (moot here — zero server-side external `fetch()` calls exist) and `GET` route handlers are no longer cached by default (this one *does* apply — every `GET` in `app/api/**` was implicitly relying on Next 14's caching-unless-dynamic default; verify none of them were silently depending on stale-cache behavior for correctness, e.g. `dashboard/summary`'s live-computed stats were already documented as "no cache" by design, so this should be a no-op, but check the others too).
6. **Run `npm ls react react-dom`** after the bump to confirm no package silently forced a `--legacy-peer-deps`-style resolution back to React 18 — the Radix/`vaul`/`react-day-picker` versions already pinned in `package.json` are recent enough to declare React 19 peer support, but this needs an actual check, not an assumption from the version numbers alone.

**Files**: `package.json`, `package-lock.json`, `next.config.js` (if the `experimental` flag needs relocating), all 16 route-handler files touched by the codemod

**Verification**:
- `npx tsc --noEmit` — no new errors vs the 2-error baseline (expect the codemod's `await params` changes to actually *reduce* type friction, not add it, since the old sync typing was already correct for Next 14)
- `npm run build` succeeds cleanly
- `npm test` — all 7 existing Vitest cases still pass (they hit `lib/report-acl.ts` directly, not through route handlers, so should be unaffected, but confirm)
- Start the dev server fresh, exercise the golden paths end-to-end: login (incl. the full 2FA flow re-verified after the 4d work), browse/search reports, view a single report (`GET /api/reports/[id]` — one of the 16 touched files), upload a report file, create/revoke a share, hit at least one of the Phase 4e job endpoints (`check-report-expiry`/`check-storage`) — since literally every dynamic route in the app was mechanically touched, breadth of manual smoke-testing matters more here than on any single-feature phase
- `npm audit` — `next@14.2.18`'s critical advisory should now be gone (a 15.x current patch release, not 15.0.0, should be targeted to avoid re-introducing any 15-era CVEs that were later patched)

### Stage 3 — Next 15 → 16 (second isolated pass, after Stage 2 is fully verified and merged)

Do not attempt this in the same pass as Stage 2 — the whole point of going stepwise is a clean verification checkpoint in between, per the "recommended strategy" finding above.

1. **Async APIs, for real this time**: Next 15's sync-access compatibility shim is gone in 16 — if Stage 2's codemod pass was thorough, this should be a no-op verification step, not new work. Re-run `npx @next/codemod@canary next-async-request-api .` explicitly (the general `upgrade` codemod does not auto-include it) as a belt-and-suspenders check before assuming Stage 2 fully covered it.
2. **Decide `middleware.ts` vs `proxy.ts`** (open decision #1 above) — needs an explicit choice recorded here before implementing, not a default pick. Whichever is chosen, test the auth gate thoroughly: unauthenticated requests still redirect to `/login`, authenticated requests still pass through, the `/login`-when-already-authenticated redirect-to-`/dashboard` still fires, and (if `proxy.ts` is chosen) confirm nothing in the auth-check path assumed Edge-only constraints that no longer apply or, more importantly, didn't rely on Edge-specific isolation for security reasons.
3. **`next.config.js` schema updates**: `experimental.turbopack` → top-level `turbopack` (if set — currently not), remove/relocate any `experimental.ppr`/`experimental.dynamicIO` (currently not set, so likely a no-op), leave `serverRuntimeConfig`/`publicRuntimeConfig` alone (not currently used — confirmed via the config file's full contents above). `images.domains` isn't used (already on `remotePatterns`). Double-check the tightened `next/image` defaults (`minimumCacheTTL`, `imageSizes`, `qualities`) don't matter here since `images.unoptimized: true` bypasses the optimization pipeline entirely — but confirm that flag is still honored as expected in 16, don't just assume.
4. **`next lint` removal**: migrate `npm run lint` off `next lint` onto direct ESLint (or Biome) CLI invocation. Run `npx @next/codemod@latest next-lint-to-eslint-cli .` — expect this to also shift the config to ESLint 9's flat-config format, which means bumping `eslint` from `^8.56.0` to `^9.x` and `eslint-config-next` to the matching major, in the same step (they're coupled, not separable sub-steps).
5. **Turbopack becomes the default bundler** (open decision #2 above) for both `next dev` and `next build`. Since no custom `webpack` config exists today, this is expected to be low-risk — but "expected" needs to become "confirmed": run a real `next build` and treat any Turbopack-specific compile failure as a real finding to fix, with `next build --webpack` as the explicit fallback if something doesn't resolve.
6. **Bump `sharp` is already done in Stage 1** — no additional action here, just confirming Node ≥20.9.0 (already satisfied) covers 16's own raised floor too.
7. **`npm audit --audit-level=high`** should now be clean of the advisories that motivated this whole plan. Flip `.github/workflows/ci.yml`'s audit step from `continue-on-error: true` back to blocking (removes the `continue-on-error` line and its explanatory comment added in Phase 4f, `c0c0c48`).

**Files**: `package.json`, `package-lock.json`, `next.config.js`, `middleware.ts` (or its `proxy.ts` replacement), `.eslintrc.json`/new flat `eslint.config.js` (whichever the codemod produces), `package.json`'s `lint` script, `.github/workflows/ci.yml`

**Verification**: everything from Stage 2's verification list, re-run in full (this is not additive-only — 16 removes the Stage-15 compatibility shims, so a regression here would be silent if only *new* behavior were tested), plus: `npm run lint` works via the new CLI, `next build` succeeds under Turbopack without `--webpack`, the chosen `middleware.ts`/`proxy.ts` path is manually exercised for every auth-gate scenario listed above, and `npm audit --audit-level=high` exits 0 — at which point the CI workflow's audit step should be flipped back to blocking.

## What this plan deliberately does not cover

- **Cache Components / `"use cache"`** (Next 16's opt-in successor to PPR) — not enabled by default, not required to close the security advisories, and explicitly flagged in the research as "a separate migration project, not a drive-by config flip." Out of scope here; revisit only if there's an actual performance/caching problem to solve.
- **Tailwind CSS major version bump** — `tailwindcss@^3.4.1` is untouched by this plan. The codebase currently has both `tailwindcss-animate` (v3-oriented) and `tw-animate-css` (v4-oriented) as dependencies simultaneously, which is worth reconciling at some point, but that's a Tailwind-major-bump decision independent of the Next.js/React/sharp/postcss security work this plan exists to close — not folded in here.
- **`@base-ui/react`** and the mixed `radix-ui` (unified package) + individual `@radix-ui/react-*` packages — not touched by this plan; flagged only as something to sanity-check post-Stage-2 (`npm ls react react-dom`) for React 19 peer-dependency fallout, not something with known issues today.

## Open decisions needing a call before Stage 3 implementation

1. **`middleware.ts` (stay on Edge) vs `proxy.ts` (move to Node.js runtime)** at the Next 16 hop — see the dedicated callout above.
2. **Turbopack-as-default acceptance** at the Next 16 hop, vs pinning back to `--webpack` if anything doesn't compile cleanly — likely resolves itself once Stage 3 is actually attempted and `next build` either works or doesn't, but flagging now so it isn't a surprise mid-stage.
3. **Scheduling**: Stages 0–1 are small and independently shippable essentially immediately. Stage 2 is a meaningfully sized, whole-codebase-touching change (31 handler signatures, full manual smoke-test pass) that deserves its own dedicated session rather than being squeezed in alongside other work. Stage 3 likewise. Confirm whether these should be picked up back-to-back or spaced out with other priorities in between.
