import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from './lib/auth';
import { isMaintenanceOn, maintenanceHtml } from './lib/maintenance';
import { previewCookieValue, safeEqual } from './lib/preview';

const intlMiddleware = createMiddleware(routing);

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://alice-in-prodland.onrender.com').replace(/\/$/, '');

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') return NextResponse.next();
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return NextResponse.redirect(`${SITE_URL}/admin/login`);
    if (await verifyAdminToken(token)) return NextResponse.next();
    return NextResponse.redirect(`${SITE_URL}/admin/login`);
  }

  // Les routes API (webhook de publication, health, og) ne sont ni localisées ni en maintenance
  if (pathname.startsWith('/api/')) return NextResponse.next();

  if (isMaintenanceOn()) {
    const previewSecret = process.env.PREVIEW_SECRET;
    const queryKey = request.nextUrl.searchParams.get('preview');
    const cookieValue = request.cookies.get('preview-token')?.value;
    const hasCookie = !!previewSecret && !!cookieValue && await safeEqual(cookieValue, await previewCookieValue(previewSecret));

    if (previewSecret && queryKey && await safeEqual(queryKey, previewSecret)) {
      const url = request.nextUrl.clone();
      url.searchParams.delete('preview');
      const res = NextResponse.redirect(SITE_URL + url.pathname + url.search);
      res.cookies.set('preview-token', await previewCookieValue(previewSecret), { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
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
