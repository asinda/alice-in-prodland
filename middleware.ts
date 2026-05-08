import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const intlMiddleware = createMiddleware(routing);

const secret = () => new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod'
);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return NextResponse.redirect(new URL('/admin/login', request.url));
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
