import { getLocalizedPosts } from '@/lib/localized-posts';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Flux RSS 2.0. Langue par défaut : français ; `?lang=en` pour l'anglais. */
export function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'fr';
  const posts = getLocalizedPosts(locale).slice(0, 30);
  const items = posts.map(p => {
    const url = `${SITE_URL}/${locale}/blog/${p.slug}`;
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${esc(p.excerpt)}</description>
${p.tags.map(t => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_NAME)}</title>
    <link>${SITE_URL}/${locale}</link>
    <description>${esc(locale === 'en' ? 'AI, architecture and integration: analyses and guides.' : "IA, architecture et intégration : analyses et guides.")}</description>
    <language>${locale}</language>
    <atom:link href="${SITE_URL}/rss.xml?lang=${locale}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' } });
}
