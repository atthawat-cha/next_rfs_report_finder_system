# RFS Report Finder System

Internal report management/discovery platform built on Next.js 16 (App Router) + Prisma 7 +
PostgreSQL. The problem it solves: reporters were re-creating reports that already existed
because there was no central, searchable place to find, preview, and reuse prior reports.

## What it does

- **Users**: search/browse reports, preview sample data, download blank report forms, export
  sample data, bookmark favorites — scoped to only the reports they have permission to view.
- **Admins**: full CRUD on report metadata and uploaded files (report/jasper/pdf/sample data,
  blank PDF form, variables, queries), fine-grained per-report access control (by user or role),
  version control on files and queries, activity logs, and a usage dashboard.

See `document/00-new_requirement.md` / `document/01-system-design.md` for the full requirements
and design, and `document/00-progress.md` for what's actually shipped so far.

## Stack

- Next.js 16 (App Router, Turbopack dev server)
- Prisma 7 + PostgreSQL, via `@prisma/adapter-pg` (not the classic Prisma engine)
- shadcn/ui (`new-york` style) + Tailwind CSS
- JWT auth (`jose`) in an httpOnly cookie, with TOTP 2FA
- Redis (rate limiting + 2FA pending-token), run via Docker Compose in dev
- Vitest for tests

## Running it

See [`SETUP.md`](./SETUP.md) for the full environment setup (database, Redis, env vars). Once set
up:

```bash
npm run dev      # http://localhost:3501 - not 3000
```

## Commands

```bash
npm run dev              # dev server, port 3501
npm run build             # production build
npm start                 # run production build, port 3501
npm run lint               # eslint
npm test                  # vitest, run once
npm run test:watch         # vitest, watch mode
npx prisma generate        # regenerate the Prisma client (gitignored - required after clone or schema change)
npx prisma migrate dev     # create/apply a migration
```

## Project docs

Project history, phase plans, and outstanding work live under `document/`:

- [`document/00-progress.md`](./document/00-progress.md) — single source of truth for what's
  shipped, what's left, and known technical debt
- [`document/feature-list.md`](./document/feature-list.md) — full feature checklist
- `document/phase*-plan.md` — per-phase implementation plans

[`CLAUDE.md`](./CLAUDE.md) has the detailed architecture notes (routing structure, auth model,
domain model, dev conventions) for anyone working on this codebase.

---

Note: the repo/package is still named `nextjs-auth-starter` for historical reasons — it started
as an auth scaffold and grew well past that into the system described above.
