import { NextRequest } from "next/server";
import { createToken } from "@/lib/auth";
import type { UserSessionType } from "@/lib/types";

interface BuildRouteRequestOptions {
  method?: string;
  url: string;
  body?: unknown;
  /** Omit (or pass null) for an anonymous request - no auth-token cookie at all. */
  user?: UserSessionType | null;
}

/**
 * Builds a real NextRequest carrying the auth-token cookie produced by
 * createToken() - the actual signer every route handler verifies against,
 * not a hand-rolled JWT. Route handlers read auth via
 * getAuthFromRequest(req)/requireAuth(req)/requireRole(req, ...), all of
 * which read the cookie off the request object directly, so no Next.js
 * request-scope (cookies()) faking is needed to test them.
 */
export async function buildRouteRequest({
  method = "GET",
  url,
  body,
  user,
}: BuildRouteRequestOptions): Promise<NextRequest> {
  const headers: Record<string, string> = {};

  if (user) {
    const token = await createToken(user);
    headers["cookie"] = `auth-token=${token}`;
  }
  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Wraps dynamic-segment params the way Next.js calls route handlers - a resolved Promise. */
export function routeParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}
