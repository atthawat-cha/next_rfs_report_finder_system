import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest,NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ZodSchema } from 'zod';
import { RoleType, UserLoginType, UserSessionType } from './types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET is not set"); })()
);
const ACCESS_TOKEN_TTL  = "15m";   // OWASP: keep short
const REFRESH_TOKEN_TTL = "7d";
const COOKIE_NAME       = "auth-token";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface JWTPayload {
  user: UserSessionType;
  exp: number;
}

// Demo users - ในการใช้งานจริงควรใช้ database
const DEMO_USERS = [
  {
    id: '1',
    username: 'admin1',
    password: '$2y$10$xkt6qDTBQ1PDfMw2Fl5SyuXzJl1fLRuA4y2Zf6sICAPwZQ7Wmsyze', // password: admin123
    name: 'Admin User',
  },
  {
    id: '2',
    username: 'user1',
    password: '$2y$10$xkt6qDTBQ1PDfMw2Fl5SyuXzJl1fLRuA4y2Zf6sICAPwZQ7Wmsyze', // password: admin123
    name: 'Demo User',
  },
];


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
  } catch (error) {
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
  } catch (error) {
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
    user_roles: user.user_roles,
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
  } catch (error) {
    return null;
  }
}

/** Read auth cookie from the incoming request */
export function getTokenFromCookie(req: NextRequest): string | undefined {
  return req.cookies.get(COOKIE_NAME)?.value;
}

/**
 * Validate token from cookie or Authorization header.
 * Use inside Next.js Route Handlers or middleware.
 *
 * @returns decoded payload or a 401 NextResponse
 */
export async function requireAuth(req: NextRequest): Promise<JWTPayload | NextResponse> {
  // 1. Try cookie first, then Bearer header
  const token = getTokenFromCookie(req) ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
export async function requireRole(req: NextRequest,allowedRoles: string[]): Promise<JWTPayload | NextResponse> {

  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result; // propagate 401

  console.log(result)

  // Check if user has at least one of the allowed roles
  const userRoles = result?.user_roles?.map(r => r.roles.name) || [];
  const role = userRoles.map(r => r);
  console.log(role);

  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return result;
}


// ─────────────────────────────────────────────
// RATE LIMITING HELPER (OWASP A07 - brute-force)
// ─────────────────────────────────────────────

/** Simple in-memory rate limiter (replace with Redis in production) */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  
  if (!identifier) {
    return { allowed: false };
  }
  const now   = Date.now();
  const entry = loginAttempts.get(identifier);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}