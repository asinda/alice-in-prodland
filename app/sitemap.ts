import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getAllPosts } from '@/lib/posts';
import { getCourses } from '@/lib/db';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';

function entry(path: string, lastModified?: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map(l => [l, `${SITE_URL}/${l}${path}`]));
  return routing.locales.map(l => ({
    url: `${SITE_URL}/${l}${path}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  for (const p of ['', '/blog', '/cours', '/about', '/glossaire']) out.push(...entry(p));
  for (const post of getAllPosts()) out.push(...entry(`/blog/${post.slug}`, post.date));
  for (const c of getCourses({ status: 'published' })) {
    out.push(...entry(`/cours/${c.slug}`, c.updatedAt));
    for (const l of c.lessons ?? []) out.push(...entry(`/cours/${c.slug}/${l.slug}`, c.updatedAt));
  }
  return out;
}
