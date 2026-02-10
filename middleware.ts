import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthFromRequest } from './lib/auth';

// หน้าที่ไม่ต้อง authentication
const publicPaths = ['/login', '/'];

// หน้าที่ต้อง authentication
const protectedPaths = ['/(auth)/dashboard', '/(auth)/profile'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ตรวจสอบว่าเป็นหน้าที่ต้อง authentication หรือไม่
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  const isPublicPath = publicPaths.includes(pathname);

  // ดึงข้อมูล user จาก token
  const user = await getAuthFromRequest(request);

  // ถ้าไม่มี user และพยายามเข้าหน้าที่ต้อง authentication
  if (isProtectedPath && !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ถ้ามี user แล้วพยายามเข้าหน้า login
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/(auth)/dashboard', request.url));
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/((?!api/auth/login).*)',
  ],
};
