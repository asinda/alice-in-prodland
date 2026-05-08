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

export async function linkGumroad(gumroadUrl: string): Promise<IntegrationResult> {
  if (!gumroadUrl || !gumroadUrl.startsWith('https://')) {
    return { status: 'skipped', error: 'URL Gumroad non renseignée' };
  }

  // On vérifie que l'URL est accessible (HEAD request)
  try {
    const res = await fetch(gumroadUrl, { method: 'HEAD' });
    if (!res.ok && res.status !== 405) {
      return { status: 'error', error: `URL Gumroad inaccessible (${res.status})` };
    }
    return {
      status: 'success',
      url: gumroadUrl,
      pushedAt: new Date().toISOString(),
    };
  } catch (e) {
    return { status: 'error', error: String(e) };
  }
}
