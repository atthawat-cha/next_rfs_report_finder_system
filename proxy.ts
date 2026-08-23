import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { getAuthFromRequest } from './lib/auth';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// หน้าที่ไม่ต้อง authentication (locale-stripped, unprefixed form)
const publicPaths = ['/login', '/'];

/**
 * With localePrefix: "as-needed", English (the default locale) keeps
 * unprefixed URLs (/dashboard) and only Thai gets a /th prefix
 * (/th/dashboard) - see document/phase11-plan.md. This strips a leading
 * /th segment so the auth-gate logic below can keep comparing against
 * plain, unprefixed paths exactly as it did before Phase 11.
 */
function stripLocalePrefix(pathname: string): { locale: string; rest: string } {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      const rest = pathname.slice(`/${locale}`.length) || '/';
      return { locale, rest };
    }
  }
  return { locale: routing.defaultLocale, rest: pathname };
}

function withLocalePrefix(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let next-intl resolve/rewrite the locale first. For the default locale
  // (English) this is a no-op pass-through; for a /th/... URL it rewrites
  // the internal request to match app/[locale]/... with locale === 'th'.
  const intlResponse = intlMiddleware(request);

  const { locale, rest } = stripLocalePrefix(pathname);

  // ดึงข้อมูล user จาก token (cookie ชื่อ 'auth-token' ตาม COOKIE_NAME ใน lib/auth.ts)
  const user = await getAuthFromRequest(request);

  // ถ้ามี user แล้วพยายามเข้าหน้า login → ส่งไป dashboard
  // (ต้องเช็คก่อน publicPaths เพราะ /login เองก็เป็น public path)
  if (rest === '/login' && user) {
    return NextResponse.redirect(new URL(withLocalePrefix(locale, '/dashboard'), request.url));
  }

  if (publicPaths.includes(rest)) {
    return intlResponse;
  }

  // ถ้าไม่มี user และพยายามเข้าหน้าที่ต้อง authentication
  if (!user) {
    const url = new URL(withLocalePrefix(locale, '/login'), request.url);
    url.searchParams.set('redirect', rest);
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - shares (public, unlocalized share links - see document/phase11-plan.md)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|shares|_next/static|_next/image|favicon.ico).*)',
  ],
};
