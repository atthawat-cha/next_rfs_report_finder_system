# Phase 12 — E2E Testing, Real S3/MinIO Storage Backend, Sentry Error Tracking

## Context

Phase 11 closed i18n (`document/00-progress.md`, 2026-08-25). Re-reading `feature-list.md`'s
remaining gaps after that close (87 ✅ / 7 ⚠️ / 6 ❌) shows most of what's left is either
intentionally dropped or blocked on infrastructure this project doesn't have and previous phases
explicitly declined to fake:

- Auth-provider selection, SQL query version diff, the "new report" subscribe-notification —
  all dropped by prior explicit decision, not revisited here.
- ClamAV AV scanning — deferred, no daemon available in any environment this project has access
  to, same reasoning Phase 12 applies below to S3/Sentry (see Resolved decisions).
- Email notifications for high-severity events — considered for this phase and explicitly
  **excluded** from scope by the user when asked.

Three gaps remain that are genuinely actionable and were selected by the user as this phase's
scope:

1. **No E2E test suite at all.** `feature-list.md`'s "Automated test suite" row is Must priority
   and marked ✅ only because Vitest unit/integration coverage exists (`lib/*.test.ts`) — there is
   no browser-driven end-to-end coverage of any golden path (login, search, download, admin CRUD).
2. **The S3/MinIO storage backend is an untested stub.** Phase 7d built a real `StorageBackend`
   interface and a working `local` implementation, but `lib/storage/s3.ts` throws
   `"not implemented"` on every method — a deliberate decision at the time because no S3/MinIO
   instance existed anywhere to test against.
3. **No error-tracking vendor sits behind Phase 7a's structured logging.** `lib/logger.ts` (pino)
   and `lib/log-dev-error.ts` are real and used everywhere, but errors only ever reach a log file/
   stdout — nothing pages anyone or aggregates them.

## Research findings (2026-08-25, this session)

- `lib/storage/{types,local,s3,index}.ts` (Phase 7d): `StorageBackend` interface with
  `write/read/delete`. `local.ts` wraps `lib/storage-path.ts`'s traversal-safe
  `resolveStoredFile()`. `s3.ts` throws on every method — its header comment explicitly says "no
  S3/MinIO credentials or self-hosted instance exist in any environment this project has access
  to." `index.ts` unconditionally exports `localStorage` as `storage`, with a comment flagging
  "swapping this to read a config value... is the seam for when a real second backend exists to
  test against."
- Exactly 5 real call sites import `@/lib/storage`: `lib/reportFileUploadServices.ts`,
  `lib/subReportUploadServices.ts`, `app/api/reports/[id]/files/[fileId]/download/route.ts`,
  `app/api/reports/[id]/files/[fileId]/preview/route.ts`,
  `app/api/shares/[token]/files/[fileId]/download/route.ts`.
- `docker-compose.yml` currently runs Redis only (rate limiting + 2FA pending-token store, both
  ephemeral/fail-open-safe, no volume) — Postgres is deliberately excluded (external dev DB). This
  is the direct precedent for adding a MinIO service the same way.
- `app/[locale]/(auth)/settings/storage/page.tsx` (Phase 5e) is a live-editable admin page for
  `UPLOAD_BASE_PATH` + per-`file_kind` max upload sizes, backed by `GET`/`PUT /api/settings/system`.
  It has no storage-backend selector today.
- `lib/logger.ts` (Phase 4f/7a) is a plain-JSON pino instance, Node-runtime only.
  `lib/log-dev-error.ts` is the single funnel point: all 61 `app/api/**/route.ts` catch blocks call
  `logDevError(error)`, which calls `logger.error(...)` outside development. This is the one
  integration point Sentry needs — no per-route-handler changes required.
- `next.config.js`'s CSP `connect-src 'self'` (Phase 4a) blocks any XHR/fetch to an external Sentry
  ingest host — must be extended once a real DSN exists, or the browser-side SDK's network calls
  get silently dropped by the browser, not by Sentry.
- No `.env.example` exists (env vars are documented in `SETUP.md` instead) — new vars
  (`STORAGE_BACKEND`, `S3_*`, `SENTRY_DSN`) get documented there, matching how `REDIS_URL`/
  `JWT_SECRET` etc. are already documented.
- `prisma/seed-ci.ts` creates CI fixture users with `password: "not-a-real-hash"` — a real UI login
  (bcrypt compare) fails against these on purpose (it only backs `findFirstOrThrow`-style Vitest
  fixtures, never a real login attempt). `prisma/seeds/user.seed.ts` is where the local dev
  "admin/123456" credential is actually created via `bcrypt.hash`. E2E tests that log in through
  the real UI need a CI fixture user with a real bcrypt hash — `seed-ci.ts` doesn't have one today.
- No Playwright config or `e2e/` directory exists yet. `vitest.config.ts` globs `**/*.test.ts` — an
  `e2e/*.spec.ts` naming convention avoids any collision with the existing Vitest suite.
- `.github/workflows/ci.yml`: single `build-test` job, Postgres service only (no Redis service —
  rate limiting/2FA presumably degrade gracefully there already; pre-existing, out of scope here),
  `npm run build` + `npm test` already run every push/PR. Adding a Playwright job needs its own
  `npx playwright install --with-deps chromium` step and a running server on :3501.

## Resolved decisions (user, 2026-08-25)

- **Sentry**: implement the full `@sentry/nextjs` wiring now (client/server/edge init,
  `logDevError()` hookup, CSP update), but keep it entirely **env-gated** — no-op with zero network
  calls when `SENTRY_DSN` is unset. No real DSN exists yet in any environment this project has
  access to (the same situation Phase 7d was in for S3, and Phase 4c for AV scanning) — live
  error-capture verification is explicitly deferred until the user supplies a real DSN.
- **S3/MinIO**: add a `minio` service to `docker-compose.yml` alongside `redis` so the S3 backend
  can be genuinely exercised locally, closing the exact blocker Phase 7d's comment cited. Implement
  `lib/storage/s3.ts` for real via `@aws-sdk/client-s3`, configured against that local MinIO by
  default in dev.
- **Backend selection is env-var-driven (`STORAGE_BACKEND=local|s3`), not a live DB-editable
  admin-UI toggle** — even though `UPLOAD_BASE_PATH` on the same settings page *is* DB-editable,
  switching storage backends live is a different hazard: existing files already written under one
  backend don't move themselves, so a live toggle would 404 every download of every file uploaded
  before the switch. `/settings/storage` gets a **read-only** "Current storage backend" indicator
  instead of a control, sourced from the env var, so admins can see it without the ability to break
  existing files by clicking a toggle.
- **E2E scope**: Playwright, headless Chromium only (no Firefox/WebKit matrix — keeps CI cost
  down), covering golden paths only, not exhaustive coverage: login (including a wrong-password
  failure case), unauthenticated redirect, report search/browse as a normal user, report detail
  view + download, admin report create/edit, and one locale-switch check (ties to Phase 11). 2FA and
  role-permission-matrix edge cases stay Vitest-only (`lib/auth.test.ts`,
  `lib/reports-route-acl.test.ts` already cover them at the unit/route-handler level) — not
  duplicated in E2E.
- **The new S3 integration test runs conditionally, not unconditionally in CI**:
  `lib/storage/s3.test.ts` talks to a *real* MinIO instance rather than mocking the AWS SDK (a mock
  would just re-assert the mock, not prove the implementation works) — it's skipped via
  `describe.skipIf(!process.env.S3_TEST_ENDPOINT)` when that env var isn't set. Local dev sets it
  (via the new `docker-compose.yml` MinIO service); CI does not get a MinIO service added, so this
  test silently skips there rather than adding CI runtime cost for infra CI doesn't need to
  validate.
- **Playwright E2E does not run inside the existing `build-test` CI job.** It becomes a second job
  (`e2e`) in the same `ci.yml` workflow, reusing the existing Postgres service, with its own
  `npm run build && npm start` + `prisma/seed-ci.ts` (extended with one bcrypt-hashed
  login-capable fixture user) before running specs against `localhost:3501`.

## Sub-phases

Independent of each other — 12a doesn't block 12b/12c and vice versa — but done in this order so
the new E2E suite exists before the storage/observability changes land, giving 12b/12c a
regression net for free.

### 12a — Playwright E2E test suite

**Install & config**
- `npm install -D @playwright/test`; `npx playwright install --with-deps chromium` (Chromium only,
  per the resolved decision above).
- `playwright.config.ts` at repo root: `testDir: './e2e'`, `use: { baseURL: 'http://localhost:3501' }`,
  a `webServer` block that runs `npm run build && npm start` (E2E must not run against `next dev`'s
  live-reload compile-on-request behavior — flaky first-hit timing) with
  `reuseExistingServer: !process.env.CI` so a local run can reuse an already-running dev server.
- Verify the actually-installed `@playwright/test` version's own config/API shape once installed —
  don't assume the shape from training data (same rule this project applied to `next-intl` in
  Phase 11a).

**Seed fixture**
- Extend `prisma/seed-ci.ts` with one `bcrypt.hash(...)`-backed SUPER_ADMIN user (a real, working
  login — not the existing `"not-a-real-hash"` placeholder) plus one real `PUBLISHED` report with a
  `BLANK_FORM` file, so the download-path spec has something real to exercise. Reuse this same seed
  locally (`DATABASE_URL` pointed at the dev DB) rather than maintaining a second seed script,
  unless actual duplication with the dev seed's assumptions turns out to be a problem once written.

**Specs** (`e2e/*.spec.ts`)
- `auth.spec.ts` — unauthenticated → redirected to locale-correct `/login`; wrong password → inline
  error, stays on `/login`; correct login → lands on `/dashboard`; logout clears the session and a
  subsequent protected-page visit redirects back to `/login`.
- `report-search.spec.ts` — logged in as a normal user, search finds the seeded report by
  name/code, opens report detail, downloads the blank form (asserts a real file response, not just
  a 200 on the page).
- `report-admin-crud.spec.ts` — logged in as admin, create a report through the tabbed editor (Info
  tab minimum required fields), confirm it now appears in `report-list`, edit one field, confirm
  the change persisted after reload.
- `locale-switch.spec.ts` — the `LocaleSwitcher` flips `/dashboard` → `/th/dashboard` and a known
  string changes language; the choice persists across a reload (`NEXT_LOCALE` cookie).

**CI wiring**
- New `e2e` job in `.github/workflows/ci.yml`: same Postgres service + env block as `build-test`,
  `npx playwright install --with-deps chromium`, `npm run build`,
  `npx prisma migrate deploy && npx tsx prisma/seed-ci.ts`, `npm start &` (background) with a
  wait-for-port step, `npx playwright test`, upload the HTML report as a build artifact on failure
  (`actions/upload-artifact`) so a failing run is debuggable without local repro.

**Verification (12a)**: `npx playwright test` green locally against the local dev DB; `tsc`/
`eslint`/`npm test` still 0 error/0 warning/green (no regressions from the new files); confirm the
new CI job's YAML is syntactically valid (a careful manual read, since this session cannot trigger
a real GitHub Actions run) — flag to the user that an actual green run on GitHub still needs
confirming post-merge, the same open item already tracked in `00-progress.md`.

### 12b — Real S3/MinIO storage backend

**Local infra**
- Add a `minio` service to `docker-compose.yml` (`minio/minio` image, ports `9000`/`9001`,
  `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` dev-only defaults, a **named volume** since — unlike
  Redis's ephemeral rate-limit state — losing uploaded files on every `docker compose up` would be
  a real dev-workflow regression, not a safe default).
- Document the new `S3_ENDPOINT`/`S3_REGION`/`S3_BUCKET`/`S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`/
  `STORAGE_BACKEND` env vars in `SETUP.md` next to the existing `REDIS_URL` block, with dev-default
  values matching the new compose service.

**Implementation**
- `npm install @aws-sdk/client-s3`.
- `lib/storage/s3.ts`: real `PutObjectCommand`/`GetObjectCommand`/`DeleteObjectCommand`
  implementation against the existing interface, `S3Client` configured with
  `forcePathStyle: true` (required for MinIO; harmless against real AWS S3) and
  endpoint/region/credentials from env.
- `lib/storage/index.ts`: select `localStorage` vs `s3Storage` from `process.env.STORAGE_BACKEND`
  (default `'local'` if unset, preserving today's behavior for anyone who doesn't set the var)
  instead of the unconditional `localStorage` export — this is the only change needed to affect the
  5 call sites, since they all already go through this module's `storage` export.
- `app/[locale]/(auth)/settings/storage/page.tsx`: add a read-only "Current storage backend" card
  (value from `GET /api/settings/system` or a small dedicated read — decide which once touching the
  file) showing `local` or `s3`, explicitly not editable, with copy explaining it's controlled by
  `STORAGE_BACKEND` at deploy time, not from this page.

**Testing**
- `lib/storage/s3.test.ts`: real integration test against the local MinIO — write,
  read-back-equals-written, delete, read-after-delete-throws — gated by
  `describe.skipIf(!process.env.S3_TEST_ENDPOINT)` per the resolved decision above.

**Verification (12b)**: with `docker compose up -d` (now including `minio`) and
`STORAGE_BACKEND=s3` + `S3_TEST_ENDPOINT` set locally, `npm test` exercises the real S3 path and
passes; with `STORAGE_BACKEND` unset (default), a live upload → download round-trip through the
actual UI still works unchanged against `local` (regression check — this must not break the only
backend anyone currently uses); `tsc`/`eslint` 0/0.

### 12c — Sentry error tracking (env-gated)

**Install & config**
- `npm install @sentry/nextjs`; run its setup wizard if the installed version ships one, then
  verify the actually-generated config shape against the installed version's own docs (per this
  project's standing "don't assume API shape from training data" rule — doubly relevant here since
  Sentry's Next.js SDK config shape has changed across major versions).
- `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` (or the newer
  single-instrumentation-file shape, whichever the installed version actually uses): each
  initializes only if `process.env.SENTRY_DSN` (or `NEXT_PUBLIC_SENTRY_DSN` for the client bundle)
  is set — no `Sentry.init()` call at all when unset, so zero SDK network activity when the env var
  is absent, matching the resolved decision.
- `next.config.js`: wrap with `withSentryConfig` (source-map upload etc.), also conditional on
  `SENTRY_DSN` being set at build time so a DSN-less build isn't forced to talk to Sentry's
  build-time API.
- `next.config.js`'s CSP `connect-src`: extend from `'self'` to include the Sentry ingest host
  pattern (`https://*.ingest.sentry.io`, or the actual DSN's host once real) **only** when Sentry is
  actually configured — don't loosen CSP for everyone when the feature is off.

**Wiring**
- `lib/log-dev-error.ts`: in the non-development branch, alongside the existing `logger.error(...)`
  call, add `Sentry.captureException(error)` — this alone covers all 61 existing call sites with no
  other file needing to change.
- Document `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` in `SETUP.md`, explicitly noting the app runs
  identically with them unset (today's default state).

**Verification (12c)**: with `SENTRY_DSN` unset (today's real state), confirm via
`npx tsc --noEmit` plus a manual code read that no `Sentry.init()` executes and no new network call
gets introduced (this is a code-level guarantee, not a runtime-observed one, since there's no real
DSN to point at and observe — flag this explicitly, the same category of limitation the S3 stub had
before 12b); `tsc`/`eslint`/`npm test`/`npm run build` all still 0/0/green/exit-0 with the new
dependency installed but inactive. **Live error-capture verification (throw a real error, confirm
it lands in a Sentry project) is explicitly out of scope until the user provides a real
`SENTRY_DSN`** — call this out to the user as a follow-up they need to trigger, not something this
phase closes end-to-end.

## Verification checklist (applies per sub-phase)

1. `npx tsc --noEmit` → 0 errors.
2. `npx eslint .` → 0 warnings.
3. `npm test` → all green (Vitest baseline 37/37 plus any new unit/integration tests added this
   phase — the S3 integration test skips gracefully without local MinIO/CI).
4. `npm run build` only after confirming the dev server on :3501 is stopped (per `CLAUDE.md`).
5. New: `npx playwright test` green (12a onward, once installed).
6. Commit per sub-phase (`feat: Phase 12a - ...` etc.), then a `document/00-progress.md` update
   commit — same convention as every prior phase.
7. Explicit flags to the user for anything this session structurally cannot verify end-to-end: a
   real GitHub Actions run of the new `e2e` CI job, and live Sentry error capture once a real DSN
   exists.
