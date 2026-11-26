'use server';

import { headers } from 'next/headers';
import { rateLimit } from '../rate-limit';
import { addSubscriber, addMessage, EMAIL_RE } from '../leads';

export type LeadState = { ok?: boolean; error?: 'invalid' | 'consent' | 'rate' | 'fail' } | null;

async function clientIp(): Promise<string> {
  const h = await headers();
  // Entrée la plus à droite : ajoutée par notre proxy, non falsifiable par le client.
  const xff = (h.get('x-forwarded-for') ?? '').split(',').map(v => v.trim()).filter(Boolean);
  return xff[xff.length - 1] || 'unknown';
}

const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? '').trim().slice(0, max);
const localeOf = (f: FormData) => (str(f, 'locale', 5) === 'en' ? 'en' : 'fr');

export async function subscribe(_: LeadState, formData: FormData): Promise<LeadState> {
  // Champ piège : un robot le remplit, un humain ne le voit pas. On répond « ok » sans rien enregistrer.
  if (str(formData, 'website', 100)) return { ok: true };
  const email = str(formData, 'email', 320);
  if (!EMAIL_RE.test(email)) return { error: 'invalid' };
  if (formData.get('consent') !== 'on') return { error: 'consent' };
  if (!rateLimit(`newsletter:${await clientIp()}`, 5, 10 * 60 * 1000).ok) return { error: 'rate' };
  try {
    addSubscriber({ email, locale: localeOf(formData), source: str(formData, 'source', 40) || 'site' });
  } catch {
    return { error: 'fail' };
  }
  return { ok: true };
}

export async function sendContact(_: LeadState, formData: FormData): Promise<LeadState> {
  if (str(formData, 'website', 100)) return { ok: true };
  const email = str(formData, 'email', 320);
  const name = str(formData, 'name', 120);
  const message = str(formData, 'message', 4000);
  if (!name || message.length < 10 || !EMAIL_RE.test(email)) return { error: 'invalid' };
  if (formData.get('consent') !== 'on') return { error: 'consent' };
  if (!rateLimit(`contact:${await clientIp()}`, 3, 30 * 60 * 1000).ok) return { error: 'rate' };
  try {
    addMessage({
      name, email, message, company: str(formData, 'company', 160), need: str(formData, 'need', 40),
      locale: localeOf(formData),
    });
  } catch {
    return { error: 'fail' };
  }
  return { ok: true };
}
