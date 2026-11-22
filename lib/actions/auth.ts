'use server';

import { cookies, headers } from 'next/headers';
import { createHash, timingSafeEqual } from 'node:crypto';
import { rateLimit, rateLimitPeek, resetRateLimit } from '../rate-limit';
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
  const IP_KEY = `login:${ip}`;
  const MAX_PER_IP = 5;
  const MAX_GLOBAL = 50;
  // Seuls les ÉCHECS consomment le quota : une connexion réussie n'est jamais bloquée
  // par un attaquant, sauf s'il a déjà épuisé le quota (limite le brute-force distribué).
  const perIp = rateLimitPeek(IP_KEY, MAX_PER_IP);
  const global = rateLimitPeek('login:global', MAX_GLOBAL);
  if (!perIp.ok || !global.ok) {
    const wait = Math.ceil(Math.max(perIp.retryAfterSec, global.retryAfterSec) / 60);
    return { error: `Trop de tentatives. Réessayez dans ${wait} min.` };
  }

  if (!password || !passwordMatches(password, process.env.ADMIN_PASSWORD)) {
    rateLimit(IP_KEY, MAX_PER_IP, WINDOW);
    rateLimit('login:global', MAX_GLOBAL, WINDOW);
    return { error: 'Mot de passe incorrect.' };
  }
  resetRateLimit(IP_KEY);

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
