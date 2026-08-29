RFS Next.js Engineering Standard

> **Verified 2026-08-30** — every 🔍 item below was investigated against the actual codebase (not guessed). Several
> previously-marked ✅ items were downgraded after investigation (Docker, Rate Limit, ACL); Validation and File
> Security were upgraded from 🔴 to 🟠 (real but incomplete, not fully absent). Evidence lives in
> `document/system-audit-2026-08-30.md` (full report + remediation plan) — this file stays the compact status view.

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
│   ├── Validation                    🟠  zod used in 28/61 routes (~46%); concentrated on POST/PUT bodies — GET query-params and simple [id] routes mostly unvalidated
│   ├── Auth                          ✅
│   ├── Authorization                 🟠  requireAuth/requireRole on 51/61 routes; 1 real gap found (see Security > RBAC)
│   ├── Error Standard                🟠  status codes consistent; error envelope shape varies ({error} / {success:false,error} / {error,details})
│   └── Response Standard             🟠  {success,data} dominant but not universal (users/roles/route.ts mixes bare-array and enveloped responses in the same file)
│
├── Security
│   ├── JWT                           ✅
│   ├── httpOnly Cookie               ✅
│   ├── RBAC                          🔴  CRITICAL: app/api/users/user/[id]/route.ts GET has NO auth check — leaks any user's PII by ID (unauthenticated IDOR)
│   ├── ACL                           🟠  enforced in 7 API endpoints via lib/report-acl.ts, but bypassable: uploaded files are served as static assets under public/, and proxy.ts only checks "is logged in," never per-report ACL, on static paths
│   ├── Rate Limit                    🟠  Redis-backed limiter exists but wired to only 4 routes (login, verify-2fa, dashboard/summary, dashboard/trends) — no general write-endpoint protection
│   ├── CSRF                          🔴  no token/double-submit anywhere; relies solely on cookie SameSite=Lax
│   ├── Security Headers              ✅  CSP/X-Frame-Options/HSTS/nosniff/Referrer-Policy/Permissions-Policy all present (next.config.js); minor: script/style-src allow 'unsafe-inline'
│   ├── Input Validation              🟠  same underlying gap as API > Validation above
│   └── File Security                 🟠  extension/size allowlists + filename sanitization + WebP re-encode are solid; gaps: no AV scan, timestamp-based (guessable) filenames, and the static-serving ACL bypass above
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
