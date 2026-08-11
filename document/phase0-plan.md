# Phase 0 — Foundation Cleanup (RFS Report Finder System)

## Context

`document/new_requirement.md` (analysis of the original requirement doc against the actual codebase) identified a "Phase 0" of foundation/bug-fix work that should land before any new feature work (search, favorites, per-report permissions, etc.), because it fixes correctness bugs in the auth path and closes gaps that would otherwise get copied into new code. The user confirmed this plan should cover **Phase 0 only** — Phase 1+ (real search, favorites, per-report ACL) is explicitly out of scope here.

Four items, confirmed via two rounds of codebase audit (Explore agents) plus a design pass (Plan agent) and direct verification of frontend call sites:

1. `middleware.ts` has three dead variables and two real bugs (wrong cookie name read, wrong redirect target) that currently happen to cancel out into "looks like it works" but will bite the next person who touches this file.
2. The login rate limiter (`lib/auth.ts`) is an in-memory `Map` — resets on every restart/deploy and doesn't work across multiple instances. Decision: add Redis now (`ioredis`), not defer.
3. `GET /api/reports/report/manage` has no pagination — it's the one table in the schema expected to grow unbounded (reports accumulate over time; currently only 5 rows in dev). Decision: add `?page=&pageSize=` now, backward-compatible defaults, no frontend UI changes this phase.
4. Nothing anywhere writes to `activity_logs` despite the table (and a page under `user-management/activity`) already existing. Decision: add a shared `logActivity()` helper and wire it into every real mutation route, including login/logout. This audit also surfaced a standalone security gap: `POST /api/users/user` and `POST /api/users/user/update` have **no auth check at all**, unlike every sibling route — decision: fix that in this phase too (confirmed safe: the one page that calls the create endpoint, `app/(auth)/user-management/user-form/page.tsx`, already sends `credentials: "include"`; no frontend caller of the update endpoint exists yet at all, so nothing to break).

Resolved decisions (via user confirmation): Redis added now; fail **open** on Redis outage (internal system, rate-limit is defense-in-depth not the primary auth boundary); pagination added now with `page`/`pageSize` query params; auth guard added to the two ungated user routes.

---

## 1. Fix `middleware.ts`

Replace the whole `middleware()` function body. Delete `protectedPaths`, `isProtectedPath`, `isPublicPath` (all three are write-only today — confirmed via full-file trace, nothing else in the repo references them), and the stray `const token = request.cookies.get('auth_token')` line (wrong cookie name — the real name is `auth-token`/`COOKIE_NAME` in `lib/auth.ts`; this repo-wide grep confirmed the underscore spelling exists nowhere else).

New control flow (order matters — the login-redirect check must run before the publicPaths bypass, otherwise an authenticated user hitting `/login`, which is itself public, would fall through instead of redirecting):

```ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await getAuthFromRequest(request);

  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url)); // was the invalid '/(auth)/dashboard'
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  if (!user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
```

Keep `publicPaths = ['/login', '/']` (now actually consulted) and the existing `config.matcher` unchanged (the `'/app/:path*'` entry matches no real route in this App Router tree, but that's pre-existing inert config, not something to touch here).

**File:** `middleware.ts` (modify only)

---

## 2. Rate limiter: `Map` → Redis

**New dependency:** `ioredis` (chosen over `redis`/Upstash — this only ever runs in a Node-runtime route handler, not Edge, so a plain TCP client is fine, and it supports a synchronous singleton pattern matching `lib/prisma.ts` without an awkward `await client.connect()`).

**New file `lib/redis.ts`** — mirrors the `globalForPrisma` singleton pattern in `lib/prisma.ts`:
```ts
import Redis from 'ioredis';

const globalForRedis = global as unknown as { redis: Redis };

const redis = globalForRedis.redis || new Redis(
  process.env.REDIS_URL ?? (() => { throw new Error("REDIS_URL is not set"); })()
);

redis.on('error', (err) => {
  console.error('[redis] connection error:', err);
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
```
The `.on('error', ...)` handler is required — an unhandled `ioredis` `'error'` event crashes the process.

**Modify `lib/auth.ts`** — replace the `loginAttempts = new Map(...)` block (keep `MAX_ATTEMPTS`, `WINDOW_MS` as the Redis TTL). Functions become `async`:
```ts
import redis from './redis';

export async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  if (!identifier) return { allowed: false };
  const key = `ratelimit:login:${identifier}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.pexpire(key, WINDOW_MS);
    if (count > MAX_ATTEMPTS) {
      const ttl = await redis.pttl(key);
      return { allowed: false, retryAfter: Math.max(0, Math.ceil(ttl / 1000)) };
    }
    return { allowed: true };
  } catch (err) {
    console.error('[rateLimit] redis error, failing open:', err);
    return { allowed: true }; // fail-open per confirmed decision
  }
}

export async function resetRateLimit(identifier: string): Promise<void> {
  try { await redis.del(`ratelimit:login:${identifier}`); }
  catch (err) { console.error('[rateLimit] redis error on reset:', err); }
}

export async function rateLimit(identifier: string) {
  return checkRateLimit(identifier);
}
```

**Required call-site fix in `app/api/auth/login/route.ts`** (the one unavoidable ripple — these were previously synchronous calls): add `await` to both call sites — `const { allowed, retryAfter } = await checkRateLimit(ip);` and `await resetRateLimit(ip);`. Without this, `allowed` would destructure off a `Promise` and every login would be incorrectly rejected.

**Env vars:** add `REDIS_URL=redis://localhost:6379` to `.env` and `.env.local`.

**Local dev Redis** (no docker-compose exists in this repo yet): `docker run -d --name rfs-redis -p 6379:6379 redis:alpine`.

**Files:** `lib/redis.ts` (new), `lib/auth.ts` (modify), `app/api/auth/login/route.ts` (modify — 2-line `await` fix only, do this together with item 4's changes to the same file to keep one clean diff), `package.json` (add `ioredis`), `.env` / `.env.local` (add `REDIS_URL`).

---

## 3. Pagination on `GET /api/reports/report/manage`

**New file `lib/pagination.ts`** — small shared helper, since this is expected to be the first of several list endpoints to eventually paginate:
```ts
export interface PaginationResult { page: number; pageSize: number; skip: number; take: number; }

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 200;

export function parsePagination(searchParams: URLSearchParams): PaginationResult {
  let page = Number(searchParams.get('page'));
  if (!Number.isFinite(page) || page < 1) page = 1;

  let pageSize = Number(searchParams.get('pageSize'));
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;
  pageSize = Math.min(pageSize, MAX_PAGE_SIZE);

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
```

**Modify `app/api/reports/report/manage/route.ts` (GET only, POST untouched):**
```ts
const { page, pageSize, skip, take } = parsePagination(req.nextUrl.searchParams);

const [reports, total] = await Promise.all([
  prisma.reports.findMany({ select: { /* unchanged */ }, skip, take }),
  prisma.reports.count(),
]);

return NextResponse.json(
  { success: true, data: reports, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } },
  { status: 200 }
);
```
`data` key and its shape are untouched; `meta` is additive. Verified `app/(auth)/reports/report-list/page.tsx`'s `fetchReports()` only reads `data.success`/`data.data`, so this is backward compatible — no frontend changes in this phase. Default `pageSize=100` comfortably covers the current 5-row dev dataset; once real report volume exceeds 100 this endpoint will start truncating silently until Phase 1 adds real pagination/search UI — acceptable per the explicit scope decision, worth a one-line code comment flagging it.

**Files:** `lib/pagination.ts` (new), `app/api/reports/report/manage/route.ts` (modify GET handler only).

---

## 4. Central `logActivity()` helper, wired into every real mutation + login/logout

**New file `lib/request-info.ts`** (shared by both the rate limiter's IP lookup and the activity logger, to avoid a weird cross-import between `lib/auth.ts` and `lib/activity-log.ts`):
```ts
import { NextRequest } from 'next/server';

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.headers.get('x-real-ip') || 'unknown';
}
```
Replace the existing ad hoc IP-extraction logic in `app/api/auth/login/route.ts` with a call to this.

**New file `lib/activity-log.ts`**:
```ts
import { NextRequest } from 'next/server';
import { faker } from '@faker-js/faker';
import prisma from '@/lib/prisma';
import { getClientIp } from '@/lib/request-info';

export type ActivityAction = 'create' | 'update' | 'delete' | 'login' | 'login_failed' | 'logout';
export type ActivityEntity = 'report' | 'user' | 'department' | 'role' | 'auth';

interface LogActivityParams {
  userId?: string | null;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(req: NextRequest, params: LogActivityParams): Promise<void> {
  try {
    await prisma.activity_logs.create({
      data: {
        id: faker.string.uuid(),
        user_id: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId,
        description: params.description,
        ip_address: getClientIp(req),
        user_agent: req.headers.get('user-agent') ?? undefined,
        metadata: params.metadata,
      },
    });
  } catch (err) {
    console.error('[logActivity] failed to write activity log:', err);
  }
}
```
`id` uses `faker.string.uuid()` to match every other `.create()` call in the codebase. Errors are swallowed so a logging failure never breaks the caller's actual response — callers should still `await` it (not detach it) so the write completes before the response is sent.

**Call sites** (English descriptions, since these are internal audit strings not shown to end users — matches the low-stakes recommendation from the design pass):

| Route | Action / Entity | Notes |
|---|---|---|
| `POST /api/reports/report/manage` | `create` / `report` | after `prisma.reports.create` succeeds; `userId` from the already-fetched `requireRole` result |
| `POST /api/users/departments` | `create` / `department` | after `prisma.departments.create` succeeds |
| `POST /api/users/roles` | `create` / `role` | capture the created role's id in a variable *outside* the `$transaction` callback, call `logActivity` **after** the transaction resolves (so a rollback never produces an orphaned log) |
| `POST /api/users/user` | `create` / `user` | see auth-guard fix below; log after user creation |
| `POST /api/users/user/update` | `update` / `user` | see auth-guard fix below |
| `POST /api/auth/login` | `login` (success) / `login_failed` (bad username or bad password) / `auth` | on `login_failed`, use the looked-up user's id when the username matched but password didn't, else `null` |
| `POST /api/auth/logout` | `logout` / `auth` | capture `getCurrentUser()` **before** calling `deleteAuthCookie()` — nothing to identify the user by afterward |

**Auth-guard fix (part of this item, confirmed safe):** add the same pattern every sibling route already uses —
```ts
const auth = getAuthFromRequest(req);
if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const authResult = await requireRole(req, routeAcceptted('admin'));
if (authResult instanceof NextResponse) return authResult;
```
— to both `POST /api/users/user` and `POST /api/users/user/update`. Verified: `app/(auth)/user-management/user-form/page.tsx` (the only current caller of the create endpoint) already sends `credentials: "include"`, so it will continue to work unmodified as long as the caller is logged in. No frontend code calls the update endpoint at all today, so nothing can break there.

**Files:** `lib/request-info.ts` (new), `lib/activity-log.ts` (new), `app/api/reports/report/manage/route.ts` (POST — add logActivity call, on top of item 3's GET changes), `app/api/users/departments/route.ts` (modify), `app/api/users/roles/route.ts` (modify), `app/api/users/user/route.ts` (modify — add auth guard + logActivity), `app/api/users/user/update/route.ts` (modify — add auth guard + logActivity), `app/api/auth/login/route.ts` (modify — add logActivity calls, swap in `getClientIp`), `app/api/auth/logout/route.ts` (modify — add logActivity call).

---

## Sequencing

All four items are independent except that items 2 and 4 both touch `app/api/auth/login/route.ts`. Implement item 2's 2-line `await` fix first, then layer item 4's logging calls + `getClientIp` swap on top, so that file gets one clean, reviewable diff per concern rather than one tangled change.

## Verification

- `npm run build` and `npm run lint` after all changes — must stay clean (this is a TypeScript-strict project; the rate-limiter functions changing from sync to async will surface any missed `await` at call sites as type errors, which is a useful compile-time check here).
- Manual middleware check: visit `/` anonymously → lands on `/login`; log in → visit `/login` again → redirected to `/dashboard` (not a 404); visit `/dashboard` anonymously (cleared cookies) → redirected to `/login?redirect=/dashboard`.
- Rate limiter: with local Redis running (`docker run -d -p 6379:6379 redis:alpine`), submit 6 rapid failed logins with the same username → 6th attempt returns 429 with `retryAfter`; a correct login resets the counter (`resetRateLimit`). Stop the Redis container and confirm login still succeeds (fail-open path) with an error logged to console.
- Pagination: `GET /api/reports/report/manage` with no query params returns all 5 dev rows plus `meta.total === 5`; `?pageSize=2` returns 2 rows and `meta.totalPages === 3`. Existing `report-list` page still renders normally with no query params.
- Activity log: after creating a report/user/department/role and logging in/out, query `SELECT * FROM activity_logs ORDER BY created_at DESC` (via `npx prisma studio` or psql) and confirm one row per action with correct `action`/`entity`/`entity_id`/`user_id`/`ip_address`. Confirm a deliberately-failed role creation (trigger a validation error) does **not** produce an activity log row for that attempt.
- Auth guard: confirm `app/(auth)/user-management/user-form/page.tsx` can still create a user while logged in as admin; confirm an unauthenticated `curl -X POST http://localhost:3501/api/users/user` (no cookie) now returns 401 instead of creating a user.
