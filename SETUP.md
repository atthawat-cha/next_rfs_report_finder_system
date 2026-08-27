# Setup

## Prerequisites

- Node.js 18+
- A PostgreSQL 16 database (either one that already has this project's migrations applied, or a
  fresh one you'll run migrations against)
- Docker (for the bundled Redis dev container) — on Windows, Docker Desktop does not auto-start
  with the OS; launch it manually before `docker compose up`

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

There is no `.env.example` checked into this repo — create `.env.local` (or `.env`) yourself with:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/your_db?schema=public
JWT_SECRET=<generate with: openssl rand -base64 32>
NEXT_PUBLIC_API_URL=http://localhost:3501
NEXT_PUBLIC_APP_URL=http://localhost:3501
NODE_ENV=development
```

## 3. Database

```bash
npx prisma generate         # required - the generated client is gitignored
npx prisma migrate deploy   # or `migrate dev` if you're evolving the schema
npx prisma migrate status   # confirm: "Database schema is up to date!"
```

Optionally seed data — see `prisma/seed.ts` (most seed steps are commented out in `main()`;
uncomment only what you need before running `npx prisma db seed`).

⚠️ Before letting `npx prisma migrate dev` apply anything that touches the `reports` table, read
`CLAUDE.md`'s note on the `search_vector` generated column — a past incident silently dropped the
full-text search indexes this way.

## 4. Redis

Rate limiting and the 2FA pending-token step need Redis reachable on port 6380:

```bash
docker compose up -d
docker compose ps     # confirm rfs-redis is Up
```

## 5. Storage backend (optional)

Report files are written/read through `lib/storage/`, which defaults to the local filesystem
(`local`). To use the bundled MinIO container as an S3-compatible backend instead, start it (it's
already declared in `docker-compose.yml` as the `minio` service):

```bash
docker compose up -d      # now also starts rfs-minio on 9000 (API) / 9001 (console)
```

Then set:

```env
STORAGE_BACKEND=s3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=<a bucket you've created via the MinIO console at http://localhost:9001>
S3_ACCESS_KEY_ID=rfsminioadmin
S3_SECRET_ACCESS_KEY=rfsminioadmin
```

Leave `STORAGE_BACKEND` unset to keep using `local` - nothing else changes. To run
`lib/storage/s3.test.ts`'s real integration test (write/read/delete against MinIO) also set
`S3_TEST_ENDPOINT=http://localhost:9000`; it's skipped otherwise.

## 6. Error tracking (optional)

The app runs identically with these unset (today's default) - no `Sentry.init()` call happens at
all, so zero Sentry SDK network activity. To turn on error reporting to a real Sentry project, set:

```env
SENTRY_DSN=<your server-side DSN>
NEXT_PUBLIC_SENTRY_DSN=<your client-side DSN>
```

`SENTRY_DSN` covers server/edge errors (`instrumentation.ts`) and every existing
`logDevError()` call site; `NEXT_PUBLIC_SENTRY_DSN` covers browser errors
(`instrumentation-client.ts`). Both are optional and independent - set either, both, or neither.

## 7. Run

```bash
npm run dev
```

Open http://localhost:3501 (not 3000).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm test` says `'vitest' is not recognized` | devDependencies missing from `node_modules` | `npm install` |
| `tsc` errors naming things that plainly exist in `schema.prisma` (e.g. `ReportOutputType`, `report_files`) | stale or missing generated Prisma client | `npx prisma generate` |
| Queries fail even though the app boots fine | `DATABASE_URL` points at a database without this project's migrations | point it at the right database, confirm with `npx prisma migrate status` |
| `docker compose up -d` can't reach the daemon | Docker Desktop isn't running | start Docker Desktop manually, wait for it, then retry |
| `.next` gets corrupted / every route starts 500ing | `npm run build` was run while `npm run dev` was also running against the same working copy - both share `.next` | never run them at the same time; see `CLAUDE.md`'s Commands section |

See `document/00-progress.md`'s ของค้าง #14 for the session this troubleshooting table was
written from.

---

For architecture, the auth model, and coding conventions, see [`CLAUDE.md`](./CLAUDE.md). For
project history and current status, see
[`document/00-progress.md`](./document/00-progress.md).
