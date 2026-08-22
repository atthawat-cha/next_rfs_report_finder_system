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

## 5. Run

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
