import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-dev-secret-change-in-prod'
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login') return NextResponse.next();

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) return NextResponse.redirect(new URL('/admin/login', request.url));
    try {
      await jwtVerify(token, secret());
    } catch {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = { matcher: '/admin/:path*' };
