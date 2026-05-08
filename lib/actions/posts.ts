'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createPost, updatePost, deletePost, publishPost, unpublishPost, getPostById,
  type ContentType,
} from '../db';
import { postToLinkedIn } from '../integrations/linkedin';
import { prepareTikTokPost } from '../integrations/tiktok';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function pushIntegrations(post: NonNullable<ReturnType<typeof getPostById>>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const payload = {
    title: post.title,
    excerpt: post.excerpt,
    url: `${siteUrl}/blog/${post.slug}`,
    tags: post.tags,
    type: post.type,
  };
  const [linkedin, tiktok] = await Promise.all([
    postToLinkedIn(payload),
    prepareTikTokPost(payload),
  ]);
  updatePost(post.id, { integrations: { ...post.integrations, linkedin, tiktok } });
}

export async function actionCreatePost(_: unknown, formData: FormData) {
  const title = (formData.get('title') as string).trim();
  const excerpt = (formData.get('excerpt') as string).trim();
  const content = (formData.get('content') as string).trim();
  const type = (formData.get('type') as ContentType) ?? 'post';
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return { error: 'Le titre est requis.' };

  const post = createPost({
    slug: slugify(title),
    title,
    excerpt,
    content,
    type,
    tags,
    status: 'draft',
    publishedAt: null,
  });

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
  await pushIntegrations(post);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath('/blog');
  revalidatePath('/');
}

export async function actionRepushPostIntegrations(id: string) {
  const post = getPostById(id);
  if (!post || post.status !== 'published') return;
  await pushIntegrations(post);
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
