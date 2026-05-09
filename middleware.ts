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
  // Strip internal port from URL so next-intl redirects don't include :3000
  // (Render reverse proxy forwards on port 3000 but external URL has no port)
  const host = request.headers.get('host') ?? '';
  let req = request;
  if (host.includes(':3000') || host.includes(':10000')) {
    const url = request.nextUrl.clone();
    url.port = '';
    url.protocol = 'https:';
    req = new NextRequest(url, { headers: request.headers, method: request.method });
  }

  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const token = req.cookies.get('admin-token')?.value;
    if (!token) return NextResponse.redirect(new URL('/admin/login', req.url));
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
