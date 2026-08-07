'use server';

import { revalidatePath } from 'next/cache';
import { getPosts, updatePost, getPostById } from '../db';
import { getAllAdminPosts, getFsPostRaw } from '../posts';
import { translatePost } from '../agents/translate';
import { setTranslation, getAllTranslations } from '../translations';

export interface TranslateAllResult {
  done: string[];
  skipped: string[];
  errors: { slug: string; error: string }[];
}

export async function actionTranslateAll(): Promise<TranslateAllResult> {
  const done: string[] = [];
  const skipped: string[] = [];
  const errors: { slug: string; error: string }[] = [];

  const existingTranslations = getAllTranslations();
  const dbPosts = getPosts();

  // Translate DB posts
  for (const post of dbPosts) {
    if (post.contentEn) { skipped.push(post.slug); continue; }
    try {
      const result = await translatePost(
        { title: post.title, excerpt: post.excerpt, content: post.content },
        'fr', 'en'
      );
      updatePost(post.id, { titleEn: result.title, excerptEn: result.excerpt, contentEn: result.content });
      done.push(post.slug);
    } catch (e) {
      errors.push({ slug: post.slug, error: String(e) });
    }
  }

  // Translate FS posts (not in DB)
  const adminPosts = getAllAdminPosts();
  const fsPosts = adminPosts.filter(p => p.source === 'fs');

  for (const fsMeta of fsPosts) {
    if (existingTranslations[fsMeta.slug]) { skipped.push(fsMeta.slug); continue; }
    const raw = getFsPostRaw(fsMeta.slug);
    if (!raw) { errors.push({ slug: fsMeta.slug, error: 'Fichier introuvable' }); continue; }
    try {
      const result = await translatePost(
        { title: raw.title, excerpt: raw.excerpt, content: raw.content },
        'fr', 'en'
      );
      setTranslation(fsMeta.slug, { titleEn: result.title, excerptEn: result.excerpt, contentEn: result.content });
      done.push(fsMeta.slug);
    } catch (e) {
      errors.push({ slug: fsMeta.slug, error: String(e) });
    }
  }

  revalidatePath('/blog');
  revalidatePath('/admin/translate');
  return { done, skipped, errors };
}

export async function actionTranslateOne(slug: string, source: 'fs' | 'db'): Promise<{ error?: string }> {
  try {
    if (source === 'db') {
      const dbPost = getPosts().find(p => p.slug === slug);
      if (!dbPost) return { error: 'Post DB introuvable' };
      const result = await translatePost(
        { title: dbPost.title, excerpt: dbPost.excerpt, content: dbPost.content },
        'fr', 'en'
      );
      updatePost(dbPost.id, { titleEn: result.title, excerptEn: result.excerpt, contentEn: result.content });
    } else {
      const raw = getFsPostRaw(slug);
      if (!raw) return { error: 'Fichier .md introuvable' };
      const result = await translatePost(
        { title: raw.title, excerpt: raw.excerpt, content: raw.content },
        'fr', 'en'
      );
      setTranslation(slug, { titleEn: result.title, excerptEn: result.excerpt, contentEn: result.content });
    }
    revalidatePath('/blog');
    revalidatePath('/admin/translate');
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}
