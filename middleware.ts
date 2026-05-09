import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const intlMiddleware = createMiddleware(routing);

const secret = () => new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod'
);

function cleanUrl(raw: string): string {
  return raw
    .replace(/^(https?:\/\/[^/:]+):\d+(.*)$/, '$1$2')
    .replace(/^http:\/\//, 'https://');
}

export default async function middleware(request: NextRequest) {
  // Render forwards requests internally on port 3000.
  // Next.js picks up that port and includes it in redirect URLs.
  // Strip it here so the browser never sees :3000.
  const rawUrl = new URL(request.url);
  if (rawUrl.port) {
    rawUrl.port = '';
    rawUrl.protocol = 'https:';
    request = new NextRequest(rawUrl.toString(), {
      headers: request.headers,
      method: request.method,
    });
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const token = request.cookies.get('admin-token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  const response = intlMiddleware(request);

  // Belt-and-suspenders: also fix Location header if port slipped through
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') ?? '';
    const clean = cleanUrl(location);
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
