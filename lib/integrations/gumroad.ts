import type { IntegrationResult } from '../db';

interface GumroadPayload {
  title: string;
  description: string;
  tags: string[];
  gumroadUrl?: string;
}

export function getGumroadDashboardUrl(payload: GumroadPayload): string {
  // Gumroad ne supporte pas la création de produits via API.
  // On ouvre le dashboard pré-rempli avec les infos du cours.
  const params = new URLSearchParams({
    name: payload.title,
    description: payload.description,
  });
  return `https://app.gumroad.com/products/new?${params.toString()}`;
}

/** Seuls gumroad.com et ses sous-domaines en https sont autorisés (anti-SSRF). */
export function isAllowedGumroadUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && (u.hostname === 'gumroad.com' || u.hostname.endsWith('.gumroad.com')) && !u.username && !u.password;
  } catch {
    return false;
  }
}

export async function linkGumroad(gumroadUrl: string): Promise<IntegrationResult> {
  if (!gumroadUrl || !gumroadUrl.startsWith('https://')) {
    return { status: 'skipped', error: 'URL Gumroad non renseignée' };
  }
  if (!isAllowedGumroadUrl(gumroadUrl)) {
    return { status: 'error', error: 'URL refusée : seul gumroad.com est autorisé' };
  }

  // On vérifie que l'URL est accessible (HEAD request)
  try {
    const res = await fetch(gumroadUrl, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(8000) });
    // Une redirection (3xx) vers l'hôte Gumroad est acceptée sans être suivie
    if (!res.ok && res.status !== 405 && !(res.status >= 300 && res.status < 400)) {
      return { status: 'error', error: `URL Gumroad inaccessible (${res.status})` };
    }
    return {
      status: 'success',
      url: gumroadUrl,
      pushedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.error('[gumroad] fetch failed:', e);
    return { status: 'error', error: 'URL Gumroad injoignable' };
  }
}
