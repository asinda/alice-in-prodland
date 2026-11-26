'use server';

import { requireAdmin } from '../require-admin';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createTerrier, updateTerrier, deleteTerrier, getTerrierById,
  createChapter, updateChapter, deleteChapter, getChapterById, nextChapterOrder,
} from '../terriers';
import type { TerrierStatus, ChapterStatus } from '../terriers';

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const str = (f: FormData, k: string) => ((f.get(k) as string | null) ?? '').trim();
const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean);
const optional = (s: string) => (s ? s : undefined);

const TERRIER_STATUSES: TerrierStatus[] = ['upcoming', 'active', 'done'];
const CHAPTER_STATUSES: ChapterStatus[] = ['planned', 'draft', 'published'];

function revalidateAll(terrierId?: string) {
  revalidatePath('/admin/terriers');
  if (terrierId) revalidatePath(`/admin/terriers/${terrierId}`);
  revalidatePath('/', 'layout');
}

// ─── Terriers ────────────────────────────────────────────────────────────────

function terrierFields(f: FormData) {
  const status = str(f, 'status') as TerrierStatus;
  return {
    title: str(f, 'title'),
    hook: str(f, 'hook'),
    description: str(f, 'description'),
    titleEn: optional(str(f, 'titleEn')),
    hookEn: optional(str(f, 'hookEn')),
    descriptionEn: optional(str(f, 'descriptionEn')),
    status: TERRIER_STATUSES.includes(status) ? status : 'upcoming',
    plannedDepth: Math.max(1, parseInt(str(f, 'plannedDepth')) || 1),
  };
}

export async function actionCreateTerrier(_: unknown, formData: FormData) {
  await requireAdmin();
  const fields = terrierFields(formData);
  if (!fields.title) return { error: 'Le titre est requis.' };
  const terrier = createTerrier({ slug: slugify(fields.title), ...fields });
  revalidateAll();
  redirect(`/admin/terriers/${terrier.id}`);
}

export async function actionUpdateTerrier(_: unknown, formData: FormData) {
  await requireAdmin();
  const id = str(formData, 'id');
  const fields = terrierFields(formData);
  if (!fields.title) return { error: 'Le titre est requis.' };
  updateTerrier(id, fields);
  revalidateAll(id);
  return { success: true };
}

export async function actionDeleteTerrier(id: string) {
  await requireAdmin();
  deleteTerrier(id);
  revalidateAll();
  redirect('/admin/terriers');
}

// ─── Chapters ────────────────────────────────────────────────────────────────

function chapterFields(f: FormData) {
  const status = str(f, 'status') as ChapterStatus;
  const plannedDate = str(f, 'plannedDate');
  const takeawaysEn = lines(str(f, 'takeawaysEn'));
  return {
    order: parseInt(str(f, 'order')) || 0,
    title: str(f, 'title'),
    hook: str(f, 'hook'),
    content: str(f, 'content'),
    takeaways: lines(str(f, 'takeaways')),
    titleEn: optional(str(f, 'titleEn')),
    hookEn: optional(str(f, 'hookEn')),
    contentEn: optional(str(f, 'contentEn')),
    takeawaysEn: takeawaysEn.length ? takeawaysEn : undefined,
    status: CHAPTER_STATUSES.includes(status) ? status : 'draft',
    plannedDate: plannedDate || null,
  };
}

export async function actionSaveChapter(_: unknown, formData: FormData) {
  await requireAdmin();
  const terrierId = str(formData, 'terrierId');
  const chapterId = str(formData, 'chapterId');
  const fields = chapterFields(formData);
  if (!fields.title) return { error: 'Le titre est requis.' };
  if (!getTerrierById(terrierId)) return { error: 'Terrier introuvable.' };
  if (!fields.order) fields.order = nextChapterOrder(terrierId);

  if (chapterId) {
    const existing = getChapterById(chapterId);
    if (!existing) return { error: 'Chapitre introuvable.' };
    const publishedAt =
      fields.status === 'published' ? existing.publishedAt ?? new Date().toISOString() : null;
    updateChapter(chapterId, { ...fields, publishedAt });
    revalidateAll(terrierId);
    return { success: true };
  }

  createChapter({
    terrierId,
    slug: slugify(fields.title),
    ...fields,
    publishedAt: fields.status === 'published' ? new Date().toISOString() : null,
  });
  revalidateAll(terrierId);
  redirect(`/admin/terriers/${terrierId}`);
}

export async function actionDeleteChapter(terrierId: string, chapterId: string) {
  await requireAdmin();
  deleteChapter(chapterId);
  revalidateAll(terrierId);
  redirect(`/admin/terriers/${terrierId}`);
}
