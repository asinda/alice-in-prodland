'use server';

import { requireAdmin } from '../require-admin';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { readVaultFile, cleanObsidianMarkdown, extractTitle } from '../obsidian';
import { importFileAsLesson, importFolderAsCourse, importTextAsLesson, importTextAsPost, MAX_NOTE_BYTES } from '../obsidian-import';
import { getCourseById } from '../db';
import { createPost } from '../db';

export async function actionImportAsPost(formData: FormData) {
  await requireAdmin();
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

/** Ajoute une note du vault comme leçon d'un cours existant, puis ouvre le cours. */
export async function actionImportAsLesson(formData: FormData) {
  await requireAdmin();
  const filePath = String(formData.get('filePath') ?? '');
  const courseId = String(formData.get('courseId') ?? '');
  if (!filePath || !courseId) return;
  const lesson = importFileAsLesson(filePath, courseId);
  revalidatePath('/admin/cours');
  if (lesson) redirect(`/admin/cours/${courseId}`);
}

/** Crée un cours en brouillon à partir d'un dossier du vault : une leçon par note. */
export async function actionImportFolderAsCourse(formData: FormData) {
  await requireAdmin();
  const dir = String(formData.get('dir') ?? '');
  const result = importFolderAsCourse(dir, String(formData.get('title') ?? ''));
  revalidatePath('/admin/cours');
  if (result) redirect(`/admin/cours/${result.course.id}`);
}

export type ImportState = { error?: string } | null;

/** Importe une autre note : texte collé ou fichier .md/.txt, comme article (brouillon) ou comme leçon d'un cours. */
export async function actionImportNote(_: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  let text = String(formData.get('content') ?? '');
  let fallbackTitle = 'Note importée';

  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_NOTE_BYTES) return { error: 'Le fichier est trop volumineux (500 Ko maximum).' };
    if (!/\.(md|markdown|txt)$/i.test(file.name)) return { error: 'Formats acceptés : .md, .markdown ou .txt.' };
    if (!text.trim()) text = await file.text();
    fallbackTitle = file.name.replace(/\.(md|markdown|txt)$/i, '');
  }
  if (!text.trim()) return { error: 'Collez une note ou choisissez un fichier.' };
  if (text.length > MAX_NOTE_BYTES) return { error: 'La note est trop longue (500 Ko maximum).' };

  const cleaned = cleanObsidianMarkdown(text);
  const title = String(formData.get('title') ?? '').trim() || extractTitle(text, fallbackTitle);
  const target = String(formData.get('target') ?? 'post');

  if (target === 'lesson') {
    const courseId = String(formData.get('courseId') ?? '');
    if (!courseId || !getCourseById(courseId)) return { error: 'Choisissez le cours qui recevra la leçon.' };
    if (!importTextAsLesson({ title, content: cleaned }, courseId)) return { error: 'Impossible d’ajouter la leçon.' };
    revalidatePath('/admin/cours');
    redirect(`/admin/cours/${courseId}`);
  }

  const post = importTextAsPost({ title, content: cleaned });
  if (!post) return { error: 'La note est vide.' };
  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}
