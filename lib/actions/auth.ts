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
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const key = `login:${ip}`;
  const limit = rateLimit(key, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfterSec / 60)} min.` };
  }

  if (!password || !passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    return { error: 'Mot de passe incorrect.' };
  }
  resetRateLimit(key);

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
