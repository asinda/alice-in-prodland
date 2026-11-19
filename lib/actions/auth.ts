'use server';

import { cookies, headers } from 'next/headers';
import { createHash, timingSafeEqual } from 'node:crypto';
import { rateLimit, resetRateLimit } from '../rate-limit';
import { redirect } from 'next/navigation';
import { signAdminToken } from '../auth';

const sha = (v: string) => createHash('sha256').update(v).digest();

function passwordMatches(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  return timingSafeEqual(sha(input), sha(expected));
}

export async function login(_: unknown, formData: FormData) {
  const password = (formData.get('password') as string) ?? '';

  const h = await headers();
  // Entrée la plus à droite de X-Forwarded-For : ajoutée par NOTRE proxy (Render), donc non
  // falsifiable. Les entrées de gauche sont fournies par le client et ne sont pas fiables.
  const xff = (h.get('x-forwarded-for') ?? '').split(',').map(v => v.trim()).filter(Boolean);
  const ip = xff[xff.length - 1] || 'unknown';
  const WINDOW = 15 * 60 * 1000;
  const perIp = rateLimit(`login:${ip}`, 5, WINDOW);
  // Plafond global : empêche de contourner la limite par IP en multipliant les sources.
  const global = rateLimit('login:global', 30, WINDOW);
  if (!perIp.ok || !global.ok) {
    const wait = Math.ceil(Math.max(perIp.retryAfterSec, global.retryAfterSec) / 60);
    return { error: `Trop de tentatives. Réessayez dans ${wait} min.` };
  }

  if (!password || !passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    return { error: 'Mot de passe incorrect.' };
  }
  resetRateLimit(`login:${ip}`);

  const token = await signAdminToken();
  const jar = await cookies();
  jar.set('admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
  });

  redirect('/admin/posts');
}

export async function logout() {
  const jar = await cookies();
  jar.delete('admin-token');
  redirect('/admin/login');
}
