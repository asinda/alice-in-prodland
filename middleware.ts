import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const intlMiddleware = createMiddleware(routing);

const secret = () => new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod'
);

function stripPort(url: string): string {
  return url.replace(/^(https?:\/\/[^/:]+):\d+(.*)$/, '$1$2').replace(/^http:\/\//, 'https://');
}

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

  const response = intlMiddleware(request);

  // Intercept redirects from next-intl and strip the internal port (:3000)
  // that Render injects in the host header when proxying requests
  if (response && response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') ?? '';
    const clean = stripPort(location);
    if (clean !== location) {
      return NextResponse.redirect(clean, { status: response.status });
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
