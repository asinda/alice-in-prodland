'use server';

import { requireAdmin } from '../require-admin';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createPost, updatePost, deletePost, publishPost, unpublishPost, getPostById, getPostBySlug,
  type ContentType,
} from '../db';
import { getFsPostRaw } from '../posts';
import { generateAndDistribute } from '../agents/distribute';
import { translatePost } from '../agents/translate';
import { hidePostBySlug } from '../visibility';

const LEVELS = ['debutant', 'intermediaire', 'avance'] as const;
type Level = (typeof LEVELS)[number];
/** Niveau saisi dans le formulaire : une valeur inconnue ou vide revient à « non renseigné ». */
function levelOf(v: FormDataEntryValue | null): Level | undefined {
  return (LEVELS as readonly string[]).includes(String(v)) ? (v as Level) : undefined;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function actionCreatePost(_: unknown, formData: FormData) {
  await requireAdmin();
  const title = (formData.get('title') as string).trim();
  const excerpt = (formData.get('excerpt') as string).trim();
  const content = (formData.get('content') as string).trim();
  const type = (formData.get('type') as ContentType) ?? 'post';
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return { error: 'Le titre est requis.' };

  const post = createPost({ slug: slugify(title), title, excerpt, content, type, tags, level: levelOf(formData.get('level')), status: 'draft', publishedAt: null });

  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}

export async function actionUpdatePost(_: unknown, formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  const title = (formData.get('title') as string).trim();
  const excerpt = (formData.get('excerpt') as string).trim();
  const content = (formData.get('content') as string).trim();
  const type = (formData.get('type') as ContentType) ?? 'post';
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return { error: 'Le titre est requis.' };
  updatePost(id, { title, excerpt, content, type, tags, level: levelOf(formData.get('level')) });
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  return { success: true };
}

export async function actionPublishPost(id: string) {
  await requireAdmin();
  const post = getPostById(id);
  if (!post) return;
  publishPost(id);
  const published = getPostById(id)!;
  // Un article déjà diffusé (masqué puis republié) n'est pas reposté une seconde fois sur les réseaux
  if (published.integrations.linkedin.status !== 'success') await generateAndDistribute(published);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath('/blog');
  revalidatePath('/');
}

export async function actionRepushPostIntegrations(id: string) {
  await requireAdmin();
  const post = getPostById(id);
  if (!post || post.status !== 'published') return;
  await generateAndDistribute(post);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
}

export async function actionUnpublishPost(id: string) {
  await requireAdmin();
  unpublishPost(id);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath('/blog');
}

export async function actionDeletePost(id: string) {
  await requireAdmin();
  deletePost(id);
  revalidatePath('/admin/posts');
  redirect('/admin/posts');
}

export async function actionTranslatePost(id: string, from: 'fr' | 'en'): Promise<{ error?: string }> {
  await requireAdmin();
  const post = getPostById(id);
  if (!post) return { error: 'Post introuvable' };
  const to = from === 'fr' ? 'en' : 'fr';
  let result;
  try {
    result = await translatePost({ title: post.title, excerpt: post.excerpt, content: post.content }, from, to);
  } catch (e) {
    console.error('[translate]', id, e);
    return { error: 'Échec de la traduction' };
  }
  if (to === 'en') {
    updatePost(id, { titleEn: result.title, excerptEn: result.excerpt, contentEn: result.content });
  } else {
    updatePost(id, { title: result.title, excerpt: result.excerpt, content: result.content });
  }
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath('/blog');
  return {};
}

export async function actionImportFsPost(slug: string) {
  await requireAdmin();
  const existing = getPostBySlug(slug);
  if (existing) { redirect(`/admin/posts/${existing.id}`); return; }

  const raw = getFsPostRaw(slug);
  if (!raw) throw new Error('Article introuvable');

  const post = createPost({ slug, title: raw.title, excerpt: raw.excerpt, content: raw.content, tags: raw.tags, type: 'post', status: 'published', publishedAt: raw.date });

  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}

/** Masque un article (fichier ou base) sans le supprimer. Il reste dans l'administration et peut être republié ou programmé. */
export async function actionHidePost(slug: string): Promise<void> {
  await requireAdmin();
  hidePostBySlug(String(slug));
  revalidatePath('/admin/posts');
  revalidatePath('/', 'layout');
}
