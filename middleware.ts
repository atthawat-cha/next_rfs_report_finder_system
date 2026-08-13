import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthFromRequest } from './lib/auth';

// หน้าที่ไม่ต้อง authentication
const publicPaths = ['/login', '/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ดึงข้อมูล user จาก token
  const user = await getAuthFromRequest(request);

  // ถ้ามี user แล้วพยายามเข้าหน้า login ให้ redirect ไปหน้า dashboard
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // ถ้าไม่มี user และพยายามเข้าหน้าที่ต้อง authentication
  if (!user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    // '/((?!api|_next/static|_next/image|favicon.ico).*)',
    // '/((?!api/auth/login).*)',
    '/app/:path*',
    '/((?!login|api|_next/static|_next/image|favicon.ico).*)',
  ],
};
