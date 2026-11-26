import { createPost, getPostBySlug, unpublishPost, type DbPost } from './db';
import { getFsPostRaw } from './posts';

/**
 * Masque un article sans le supprimer : il disparaît du site (liste, page, recherche, flux, plan du site) mais reste dans
 * l'administration, éditable, et peut être republié ou programmé plus tard.
 * - article déjà en base : repasse en brouillon ;
 * - article « .md » : une copie en brouillon est créée en base, elle prend le dessus sur le fichier (qui n'est pas modifié).
 */
export function hidePostBySlug(slug: string): DbPost | null {
  const existing = getPostBySlug(slug);
  if (existing) return existing.status === 'published' ? unpublishPost(existing.id) : existing;

  const raw = getFsPostRaw(slug);
  if (!raw) return null;
  return createPost({
    slug, title: raw.title, excerpt: raw.excerpt, content: raw.content, tags: raw.tags,
    level: raw.level, type: 'post', status: 'draft', publishedAt: null,
  });
}
