import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { isMaintenanceOn, maintenanceHtml } from './lib/maintenance';

const intlMiddleware = createMiddleware(routing);

const secret = () => new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod'
);

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alice-in-prodland.onrender.com').replace(/\/$/, '');

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return NextResponse.redirect(`${SITE_URL}/admin/login`);
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(`${SITE_URL}/admin/login`);
    }
  }

  if (isMaintenanceOn()) {
    const previewSecret = process.env.PREVIEW_SECRET;
    const queryKey = request.nextUrl.searchParams.get('preview');
    const hasCookie = !!previewSecret && request.cookies.get('preview-token')?.value === previewSecret;

    if (previewSecret && queryKey === previewSecret) {
      const url = request.nextUrl.clone();
      url.searchParams.delete('preview');
      const res = NextResponse.redirect(SITE_URL + url.pathname + url.search);
      res.cookies.set('preview-token', previewSecret, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    if (!hasCookie) {
      const locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'fr';
      return new NextResponse(maintenanceHtml(locale), {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '86400', 'Cache-Control': 'no-store' },
      });
    }
  }

  const response = intlMiddleware(request);

  // Render injects PORT (3000 or 10000) and Next.js includes it in redirect URLs.
  // Intercept every redirect and rebuild the URL from NEXT_PUBLIC_SITE_URL so the
  // browser never sees an internal port in the Location header.
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') ?? '';
    if (location) {
      let cleanRedirect: string;
      try {
        const locUrl = new URL(location);
        cleanRedirect = SITE_URL + locUrl.pathname + locUrl.search + locUrl.hash;
      } catch {
        // relative URL — just prepend SITE_URL
        cleanRedirect = SITE_URL + location;
      }
      return NextResponse.redirect(cleanRedirect, { status: response.status });
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
