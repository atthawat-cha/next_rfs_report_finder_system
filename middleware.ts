import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthFromRequest } from './lib/auth';

// หน้าที่ไม่ต้อง authentication
const publicPaths = ['/login', '/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ดึงข้อมูล user จาก token (cookie ชื่อ 'auth-token' ตาม COOKIE_NAME ใน lib/auth.ts)
  const user = await getAuthFromRequest(request);

  // ถ้ามี user แล้วพยายามเข้าหน้า login → ส่งไป dashboard
  // (ต้องเช็คก่อน publicPaths เพราะ /login เองก็เป็น public path)
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (publicPaths.includes(pathname) || pathname.startsWith('/shares/')) {
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
    '/app/:path*',
    // ไม่ exclude '/login' ที่นี่ — middleware ต้องทำงานบน /login เพื่อ redirect
    // user ที่ login แล้วไปหน้า dashboard (ตัว /login เองอยู่ใน publicPaths อยู่แล้ว)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
