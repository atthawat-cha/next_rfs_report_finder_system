# System Audit & Remediation Plan — 2026-08-30

> Companion to `system-checklist.md` (compact status view). This file has the evidence and the plan.
> Produced by auditing the live codebase against every item in `system-checklist.md` — six parallel
> investigations, one per checklist section, each reading real files (not inferring from docs).

## Executive summary

The system is **more mature than `system-checklist.md`'s pre-audit state suggested** in testing and
observability — Sentry, Playwright E2E, and real DB-integration tests all exist and were previously
unmarked (🔍). It is **less mature than marked** in a few places that had been rubber-stamped ✅ without
recent verification: Docker (app itself isn't containerized), Rate Limit (only 4 routes), and ACL
(bypassable at the static-file layer). And it has **one real, immediately-exploitable security bug**:
an unauthenticated endpoint that leaks any user's PII by ID.

Net: no architectural rewrite is warranted. The gaps are concentrated in (1) one urgent auth bug,
(2) consistency (validation/error-envelope/transactions applied to ~half the routes instead of all),
and (3) ops maturity that was never attempted (CD, backups, health check) because there's no deploy
target yet.

## 🔴 P0 — Fix now (security-critical, small/isolated changes)

1. **Unauthenticated PII leak (IDOR)** — `app/api/users/user/[id]/route.ts` GET has no `requireAuth`/`requireRole`
   call at all. Anyone who knows or guesses a user ID gets back username/email/first_name/last_name/status/department_id.
   Fix: add the standard `requireRole(req, roleAcceptted('user'))` guard used everywhere else in the codebase.
   Trivial, one file, no schema change.

2. **ACL bypass via static file serving** — uploaded report files (`public/assest/report-files/...`) are served
   by Next's static handler. `proxy.ts`'s matcher never excludes `public/`, but its check there is only
   "is there a logged-in session" — it never calls `lib/report-acl.ts`. Once a user has seen any file's path
   (e.g. from a PUBLIC report, or devtools), they can fetch it forever, even after the report is set
   RESTRICTED/PRIVATE. Fix requires an architectural decision — see "Needs a decision" below.

3. **CSRF has no defense-in-depth** — currently relying solely on `SameSite=Lax` on the `auth-token` cookie.
   That's an adequate baseline for modern browsers but has no second layer. Cheapest fix: require a custom
   header (e.g. `X-Requested-With: XMLHttpRequest`) on all state-changing routes — cross-site form submits can't
   set custom headers, so this closes the gap SameSite doesn't cover, with no UX impact since the app is SPA-style
   fetch calls already.

4. **Rate limiting is auth-only** — extend `lib/rate-limit.ts`'s existing Redis limiter to report create/update,
   ticket create, favorites, and other write endpoints — not just login and 2 dashboard routes.

## 🟠 P1 — Data integrity & API consistency

5. **Wrap remaining multi-step writes in `$transaction`**: report creation (file upload + `reports.create` +
   related metadata), permissions/shares bulk update (delete-then-recreate pattern), sub-reports/variables batch
   writes. A partial failure here currently leaves orphaned files or inconsistent ACL state.
6. **Extend zod validation to the remaining ~54% of routes** — prioritize GET routes whose query params feed
   Prisma `where` clauses (`reports/browse`) and all `[id]` routes (type/format check the id itself, independent
   of the P0 auth fix).
7. **Pick one response/error envelope and enforce it** — `{success, data, error?}` is already the dominant
   shape; fix the stragglers (`app/api/users/roles/route.ts` returns a bare array in one branch).

## 🟡 P2 — Engineering hygiene (no urgency, pays down real debt)

8. **Introduce a thin service layer** for the two highest-traffic domains (reports, users) — extract the
   inline Prisma+business-logic blocks out of `route.ts` into `lib/*Service.ts` functions. Not a full
   repository-pattern rewrite; just stop the sprawl in the busiest files.
9. **Environment validation at boot** — add `lib/env.ts` with a zod schema for `DATABASE_URL`, `JWT_SECRET`,
   `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`; fail fast instead of silently running with `undefined`.
10. **Health check endpoint** — `app/api/health/route.ts` checking DB (`prisma.$queryRaw`) + Redis
    (`checkRateLimit`'s client) connectivity. Cheap, and a prerequisite for any real CD/deploy story.

## 🟢 P3 — Performance & polish

11. **Re-enable `next/image` optimization** — `next.config.js` currently sets `images.unoptimized: true`,
    which defeats the point of the 3 `next/image` usages already in the code. Either turn it back on (if the
    original reason for disabling it no longer applies) or document why it's intentionally off.
12. **`next/dynamic` for heavy client components** — dashboard charts (`TrendAreaChart`, `BreakdownBarChart`)
    and the PDF preview `<embed>` wrapper are all in the main bundle; lazy-load them.
13. **Responsive pass** on `reports/report-create` (zero responsive classes today) and `role-management`.
14. **`app/**/error.tsx` boundaries** as a safety net alongside the existing (good) toast-based error handling —
    covers the case where a component throws during render, which toasts can't catch.
15. Widen the Redis cache (`lib/cache.ts`) beyond the 4 dashboard endpoints only if/when a real perf problem
    shows up on the other list endpoints — not needed pre-emptively, they're already paginated at the DB layer.

## ⚪ P4 — Ops maturity (needs a decision, not just code)

16. **Deploy target decision** — there is currently no CD, no app Dockerfile, and no documented deploy plan.
    Nothing here should be built before the user picks a target (self-hosted Docker + reverse proxy? Vercel?
    on-prem?) — the right CD pipeline and Dockerfile differ a lot by answer.
17. **DB backup strategy** — depends on #16 (managed Postgres backups vs a `pg_dump` cron on the same box).
18. **Turn on Sentry in prod** — trivial once #16 is settled; just set `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`.
19. **Metrics/APM** — low priority; Sentry's performance monitoring may cover this without adding Prometheus.

## Full verified checklist (evidence)

See `system-checklist.md` for the compact status view with a one-line evidence note per item — this file
doesn't repeat it. Anything marked 🟠/🔴 there is covered by a numbered item above.

## Suggested next step

If you want this executed as a phase (matching the project's `phaseN-plan.md` convention), P0 fits cleanly
as **Phase 16 — Security Hardening Round 2** (items 1–4 only; each is small and isolated, verifiable independently).
P1–P3 would be a natural Phase 17. P4 stays blocked on a deploy-target decision and shouldn't be scheduled yet.
