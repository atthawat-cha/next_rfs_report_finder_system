RFS Next.js Engineering Standard

> **Verified 2026-08-30, updated 2026-08-30 post-Phase 16** — every 🔍 item below was investigated against the actual
> codebase (not guessed). Several previously-marked ✅ items were downgraded after investigation (Docker, Rate Limit,
> ACL); Validation and File Security were upgraded from 🔴 to 🟠 (real but incomplete, not fully absent). Evidence for
> the original pass lives in `document/system-audit-2026-08-30.md` (full report + remediation plan) — this file stays
> the compact status view. **Phase 16 (`49af393`, same day) closed all 4 P0 findings this pass surfaced — RBAC, ACL,
> CSRF, Rate Limit below are re-verified against the fix; see [`phase16-plan.md`](./phase16-plan.md) and
> `00-progress.md`'s "### Phase 16" section for the fix write-up.**

│
├── Architecture
│   ├── App Router                    ✅
│   ├── Route Groups                  ✅
│   ├── Nested Layout                ✅
│   ├── Server Components             🟠  data-fetching still lives client-side (useEffect+fetch); server pages are thin auth-only wrappers
│   ├── Client Components             🟠  16/22 auth pages are "use client"; heavy client-fetch pattern throughout
│   └── Feature-based structure       ✅  confirmed — domain folders under reports/, user-management/, role-management/
│
├── Type Safety
│   ├── TypeScript                    ✅
│   ├── Strict Mode                   ✅  tsconfig.json: "strict": true, no sub-flag overrides
│   ├── Path Alias                    ✅
│   └── No Type Errors                ✅  per CLAUDE.md baseline (0 errors as of 2026-08-18)
│
├── Data
│   ├── Prisma                        ✅
│   ├── PostgreSQL                    ✅
│   ├── Service Layer                 🔴  53/61 route.ts inline prisma+business logic; only 3 lib/*Services.ts, upload-only
│   ├── Repository Layer              🔴  zero abstraction — routes/services call the bare prisma singleton directly
│   └── Transactions                  🟠  10 real $transaction uses (2FA, menus, queries, version rollback, roles) but report creation, permissions/shares bulk update, sub-reports/variables writes are multi-step and NOT wrapped
│
├── API
│   ├── Route Handlers                ✅
│   ├── Validation                    🟠  zod used in 29/63 routes (~46%, unchanged); concentrated on POST/PUT bodies — GET query-params and simple [id] routes mostly unvalidated
│   ├── Auth                          ✅
│   ├── Authorization                 ✅  FIXED: requireAuth/requireRole on 53/63 routes; the other 10 are intentionally public (login/logout/verify-2fa, settings/public, shares/[token]/* x3) or dead placeholder stubs (users/departments/[id], users/departments/update, users/permissions — each just returns a hardcoded "Hello World", no real data) — the one real gap (users/user/[id] GET) is fixed, see Security > RBAC
│   ├── Error Standard                🟠  status codes consistent; error envelope shape varies ({error} / {success:false,error} / {error,details})
│   └── Response Standard             🟠  {success,data} dominant but not universal (users/roles/route.ts mixes bare-array and enveloped responses in the same file)
│
├── Security
│   ├── JWT                           ✅
│   ├── httpOnly Cookie               ✅
│   ├── RBAC                          ✅  FIXED (Phase 16a, `49af393`): app/api/users/user/[id]/route.ts GET now calls requireRole(routeAcceptted('admin')), matching its sibling list endpoint — verified live: unauthenticated → 401, non-admin → 403, admin → 200 with correct data
│   ├── ACL                           ✅  FIXED (Phase 16b, `49af393`): default UPLOAD_BASE_PATH moved out of public/ to storage/uploads/ (outside Next's static-file root) + PUT /settings/storage now rejects any value that resolves back into public/, closing the static-serving bypass; this dev DB's 7 pre-existing files migrated for real (`scripts/migrate-report-storage-root.ts`, verified 404 on the old public/ path afterward) and the legacy `reports.file_path` fallback (`lib/legacy-report-file.ts`) covers the same 3 serving routes (download/thumbnail/shares-download) so old rows don't 404 either — still enforced via lib/report-acl.ts in the same endpoints as before, including the admin-bypass branch added to GET /api/reports/browse the same day (routeAcceptted('admin') re-check, same pattern as the file-download routes) for the report-list "see all statuses" fix
│   ├── Rate Limit                    🟠  IMPROVED (Phase 16d, `49af393`): added `checkGeneralRateLimit` (60/min) wired to 6 more write-heavy endpoints (report create, favorites, tickets, sub-reports, permissions, shares) — 10 routes covered in total now, still not universal (a repo-wide gate needs proxy.ts's matcher to cover /api/*, an architectural change scoped out of Phase 16 on purpose — see 00-progress.md)
│   ├── CSRF                          🟠  IMPROVED (Phase 16c, `49af393`): lib/auth.ts's requireAuth() now 403s any cookie-authenticated, non-safe-method request whose Origin header doesn't match the app's own origin — real defense-in-depth verified live (cross-site Origin + cookie → 403; same-origin/no-Origin-header → passes through), though still not a full double-submit-token CSRF pattern
│   ├── Security Headers              ✅  CSP/X-Frame-Options/HSTS/nosniff/Referrer-Policy/Permissions-Policy all present (next.config.js); minor: script/style-src allow 'unsafe-inline'
│   ├── Input Validation              🟠  same underlying gap as API > Validation above
│   └── File Security                 🟠  extension/size allowlists + filename sanitization + WebP re-encode are solid; gaps: no AV scan, timestamp-based (guessable) filenames — the static-serving ACL bypass noted here previously is fixed, see ACL above (Phase 16b)
│
├── UI
│   ├── shadcn/ui                     ✅
│   ├── Responsive                    🔴  report-create has zero responsive classes; role-management/user-management thin coverage
│   ├── Accessibility                 🟠  Label usage decent (12 files), Radix primitives inject aria/role at runtime, but manual aria-* is sparse — not verified via rendered DOM
│   ├── Loading State                 ✅  isLoading/Skeleton pattern in 14 files, shared skeletonTable.tsx reused
│   ├── Error State                   🟠  no app/**/error.tsx boundaries anywhere, but toast-based error surfacing is pervasive (77 occurrences/26 files)
│   └── Empty State                   ✅  explicit empty-state UI in 17 files
│
├── Performance
│   ├── Image Optimization             🟠  next/image used correctly (3 files) but next.config.js sets images.unoptimized=true, disabling the optimization pipeline entirely
│   ├── Font Optimization             ✅  next/font/google (Inter) in layout, no raw @font-face/link
│   ├── Caching                       🟠  Redis-backed cache (lib/cache.ts) wired to only 4 dashboard endpoints; every other endpoint hits Postgres fresh
│   ├── Pagination                    ✅  real skip/take (lib/pagination.ts) on all major list endpoints; small combobox lists intentionally unpaginated
│   └── Code Splitting                🔴  zero next/dynamic usage anywhere — charts, PDF preview all bundled into the main chunk
│
├── Testing
│   ├── Unit                          ✅  7 files / 860 lines (auth, ACL, SQL parsing, S3 storage)
│   ├── Integration                   ✅  lib/report-acl.test.ts + reports-route-acl.test.ts run against the real dev DB (not mocked)
│   └── E2E                           🟠  Playwright configured, 5 substantive specs (auth, report CRUD, editor tabs, search, locale) — narrow relative to full app surface, not unimplemented
│
├── Observability
│   ├── Application Logging           🟠  lib/logger.ts (pino) exists but adopted in only ~16% of routes; rest use console.* or nothing
│   ├── Audit Logging                 ✅  activity_logs + logActivity() invoked from 34 route files, covers auth/CRUD/permissions/downloads/etc.
│   ├── Error Tracking                ✅  @sentry/nextjs fully wired (instrumentation.ts, CSP allowance) but dormant — SENTRY_DSN unset in current env
│   ├── Health Check                  🔴  no /api/health or /api/status route exists
│   └── Metrics                       🔴  no Prometheus/OpenTelemetry/APM package present
│
└── DevOps
    ├── Docker                        🟠  docker-compose.yml only covers Redis + MinIO (local deps); no Dockerfile for the Next.js app itself, Postgres is deliberately external
    ├── CI                            ✅  .github/workflows/ci.yml: real postgres:16 service, migrate+seed, tsc, eslint --max-warnings 0, build, unit tests, e2e (Playwright) job, npm audit (non-blocking)
    ├── CD                            🔴  no deploy job/workflow, no Vercel config, no documented deploy target
    ├── Environment Validation        🔴  no lib/env.ts or schema-validated env; only ad-hoc throws (JWT_SECRET) — missing vars silently become undefined
    ├── DB Backup                     🔴  no pg_dump script, scheduled job, or documented backup strategy anywhere
    └── Migration Strategy             ✅  11 real sequential migrations in prisma/migrations/, search_vector generated-column hazard documented and reflected in real migration history
