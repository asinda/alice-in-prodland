'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createPost, updatePost, deletePost, publishPost, unpublishPost, getPostById, getPostBySlug,
  type ContentType,
} from '../db';
import { getFsPostRaw } from '../posts';
import { generateAndDistribute } from '../agents/distribute';
import { translatePost } from '../agents/translate';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function actionCreatePost(_: unknown, formData: FormData) {
  const title = (formData.get('title') as string).trim();
  const excerpt = (formData.get('excerpt') as string).trim();
  const content = (formData.get('content') as string).trim();
  const type = (formData.get('type') as ContentType) ?? 'post';
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return { error: 'Le titre est requis.' };

  const post = createPost({ slug: slugify(title), title, excerpt, content, type, tags, status: 'draft', publishedAt: null });

  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}

export async function actionUpdatePost(_: unknown, formData: FormData) {
  const id = formData.get('id') as string;
  const title = (formData.get('title') as string).trim();
  const excerpt = (formData.get('excerpt') as string).trim();
  const content = (formData.get('content') as string).trim();
  const type = (formData.get('type') as ContentType) ?? 'post';
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return { error: 'Le titre est requis.' };
  updatePost(id, { title, excerpt, content, type, tags });
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  return { success: true };
}

export async function actionPublishPost(id: string) {
  const post = getPostById(id);
  if (!post) return;
  publishPost(id);
  const published = getPostById(id)!;
  await generateAndDistribute(published);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath('/blog');
  revalidatePath('/');
}

export async function actionRepushPostIntegrations(id: string) {
  const post = getPostById(id);
  if (!post || post.status !== 'published') return;
  await generateAndDistribute(post);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
}

export async function actionUnpublishPost(id: string) {
  unpublishPost(id);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath('/blog');
}

export async function actionDeletePost(id: string) {
  deletePost(id);
  revalidatePath('/admin/posts');
  redirect('/admin/posts');
}

export async function actionTranslatePost(id: string, from: 'fr' | 'en'): Promise<{ error?: string }> {
  const post = getPostById(id);
  if (!post) return { error: 'Post introuvable' };
  const to = from === 'fr' ? 'en' : 'fr';
  const result = await translatePost({ title: post.title, excerpt: post.excerpt, content: post.content }, from, to);
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
  const existing = getPostBySlug(slug);
  if (existing) { redirect(`/admin/posts/${existing.id}`); return; }

  const raw = getFsPostRaw(slug);
  if (!raw) throw new Error(`Fichier posts/fr/${slug}.md introuvable`);

  const post = createPost({ slug, title: raw.title, excerpt: raw.excerpt, content: raw.content, tags: raw.tags, type: 'post', status: 'published', publishedAt: raw.date });

  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}
