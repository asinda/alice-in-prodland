'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { readVaultFile, cleanObsidianMarkdown, extractTitle } from '../obsidian';
import { createPost } from '../db';

export async function actionImportAsPost(formData: FormData) {
  const filePath = formData.get('filePath') as string;
  if (!filePath) return;

  const raw = readVaultFile(filePath);
  const content = cleanObsidianMarkdown(raw);
  const fileName = filePath.split('/').pop() ?? filePath;
  const title = extractTitle(raw, fileName);

  const post = createPost({
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9À-ɏ]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80),
    title,
    excerpt: '',
    content,
    tags: [],
    type: 'post',
    status: 'draft',
    publishedAt: null,
  });

  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}
