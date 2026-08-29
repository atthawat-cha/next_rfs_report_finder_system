import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserSessionType } from './types';


const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET is not set"); })()
);
const REFRESH_TOKEN_TTL = "7d";
const COOKIE_NAME = "auth-token";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface JWTPayload {
  user: UserSessionType;
  exp: number;
}

// สร้าง JWT token
export async function createToken(user: UserSessionType): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(JWT_SECRET);

  return token;
}

// ตรวจสอบ JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ดึงข้อมูล user จาก token
export async function getCurrentUser(): Promise<UserSessionType | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    return payload?.user || null;
  } catch {
    return null;
  }
}

// ตรวจสอบ credentials และ login
export async function authenticate(loginUser: LoginRequest, user: UserSessionType): Promise<UserSessionType | null> {
  // const users = DEMO_USERS.find((u) => u.username === username);  
  if (!loginUser.username || !loginUser.password) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(loginUser.password, user.password || '');

  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    password: user.password,
    department_id: user.department_id,
    roles: user.roles,
  };
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Delete auth cookie
export async function deleteAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ตรวจสอบ authentication จาก request
export async function getAuthFromRequest(request: NextRequest): Promise<UserSessionType | null> {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    return payload?.user || null;
  } catch {
    return null;
  }
}

/** Read auth cookie from the incoming request */
export function getTokenFromCookie(req: NextRequest): string | undefined {
  return req.cookies.get(COOKIE_NAME)?.value;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * True unless the request carries an Origin header that doesn't match this
 * request's own Host - i.e. only blocks a mismatch, never blocks on absence
 * (not every legitimate caller sends Origin).
 */
function isTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

/**
 * Validate token from cookie or Authorization header.
 * Use inside Next.js Route Handlers or proxy.ts.
 *
 * @returns decoded payload or a 401/403 NextResponse
 */
export async function requireAuth(req: NextRequest): Promise<JWTPayload | NextResponse> {
  // 1. Try cookie first, then Bearer header
  const cookieToken = getTokenFromCookie(req);
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = cookieToken ?? bearerToken;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // CSRF defense-in-depth: a cookie-authenticated request that changes state
  // must originate from this app's own origin. SameSite=Lax (setAuthCookie)
  // already blocks cross-site simple form POSTs in modern browsers; this
  // closes the gap for fetch/XHR-based cross-site requests and any browser
  // where SameSite is ineffective. Bearer-token callers are exempt - forging
  // one requires stealing the token itself, not just riding an ambient cookie.
  if (cookieToken && !bearerToken && !SAFE_METHODS.has(req.method) && !isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return payload;
}


/**
 * Role-based access control guard.
 * Pass the result of requireAuth, plus the allowed roles.
 *
 * @example
 * const auth = await requireRole(req, ["ADMIN"]);
 * if (auth instanceof NextResponse) return auth; // 401 or 403
 */
export async function requireRole(req: NextRequest, allowedRoles: string[]): Promise<JWTPayload | NextResponse> {

  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result; // propagate 401

  // Check if user has at least one of the allowed roles. A user with no
  // role assigned (roles missing/null) is denied rather than crashing the
  // request on .toLowerCase() of undefined - the non-null assertion this
  // replaced silenced the type error but not the runtime one.
  const { user } = result
  const userRole = user?.roles?.name
  if (!userRole || !allowedRoles.includes(userRole.toLowerCase())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return result;
}


/**
 * Maps a coarse access tier to the role names allowed to call a route.
 *
 * The tiers are a *minimum* bar, not disjoint sets: every tier includes the
 * roles above it. `'admin'` therefore appears in the `user` tier too - the
 * six `routeAcceptted('user')` routes (browse, favorites x3, report download,
 * report-file download/preview) are all either scoped to the caller's own rows
 * or gated by lib/report-acl.ts inside the handler, and the two file routes
 * additionally re-check `routeAcceptted('admin')` internally to bypass the ACL.
 * Leaving `'admin'` out of this list (as it was until 2026-08-20) 403'd the
 * plain ADMIN role out of every one of them *before* that inner logic could
 * run, while GET /api/reports/[id] - which has no tier gate - kept telling the
 * UI `can_export/can_print: true`. See 00-progress.md's ของค้าง #13.
 */
export function routeAcceptted(access: string): string[] {
  const acc = {
    admin: ['admin', 'super_admin'],
    user: ['user', 'admin', 'super_admin'],
    guest: ['guest'],
  }

  return acc[access as keyof typeof acc] || []
}