import path from 'path';
import { readJsonFile, writeJsonFile } from './jsonStore';

const dataDir = path.join(process.cwd(), 'data');

// ─── Types ──────────────────────────────────────────────────────────────────

export type TerrierStatus = 'upcoming' | 'active' | 'done';
export type ChapterStatus = 'planned' | 'draft' | 'published';

export interface DbTerrier {
  id: string;
  slug: string;
  title: string;
  hook: string;
  description: string;
  titleEn?: string;
  hookEn?: string;
  descriptionEn?: string;
  status: TerrierStatus;
  plannedDepth: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbChapter {
  id: string;
  terrierId: string;
  slug: string;
  order: number;
  title: string;
  hook: string;
  content: string;
  takeaways: string[];
  titleEn?: string;
  hookEn?: string;
  contentEn?: string;
  takeawaysEn?: string[];
  status: ChapterStatus;
  plannedDate: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function now(): string {
  return new Date().toISOString();
}

function readJson<T>(file: string): T[] {
  return readJsonFile<T[]>(path.join(dataDir, file), []);
}

function writeJson<T>(file: string, data: T[]): void {
  writeJsonFile(path.join(dataDir, file), data);
}

const TERRIERS = 'terriers.json';
const CHAPTERS = 'chapters.json';

// ─── Terriers ────────────────────────────────────────────────────────────────

export function getTerriers(filter?: { status?: TerrierStatus }): DbTerrier[] {
  let list = readJson<DbTerrier>(TERRIERS);
  if (filter?.status) list = list.filter(t => t.status === filter.status);
  return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getTerrierById(id: string): DbTerrier | null {
  return getTerriers().find(t => t.id === id) ?? null;
}

export function getTerrierBySlug(slug: string): DbTerrier | null {
  return getTerriers().find(t => t.slug === slug) ?? null;
}

export function createTerrier(
  data: Omit<DbTerrier, 'id' | 'createdAt' | 'updatedAt'>,
): DbTerrier {
  const list = readJson<DbTerrier>(TERRIERS);
  const terrier: DbTerrier = { ...data, id: cuid(), createdAt: now(), updatedAt: now() };
  list.push(terrier);
  writeJson(TERRIERS, list);
  return terrier;
}

export function updateTerrier(
  id: string,
  data: Partial<Omit<DbTerrier, 'id' | 'createdAt'>>,
): DbTerrier {
  const list = readJson<DbTerrier>(TERRIERS);
  const idx = list.findIndex(t => t.id === id);
  if (idx === -1) throw new Error(`Terrier ${id} not found`);
  list[idx] = { ...list[idx], ...data, updatedAt: now() };
  writeJson(TERRIERS, list);
  return list[idx];
}

export function deleteTerrier(id: string): void {
  writeJson(TERRIERS, readJson<DbTerrier>(TERRIERS).filter(t => t.id !== id));
  writeJson(CHAPTERS, readJson<DbChapter>(CHAPTERS).filter(c => c.terrierId !== id));
}

// ─── Chapters ────────────────────────────────────────────────────────────────

export function getChapters(terrierId: string, filter?: { status?: ChapterStatus }): DbChapter[] {
  let list = readJson<DbChapter>(CHAPTERS).filter(c => c.terrierId === terrierId);
  if (filter?.status) list = list.filter(c => c.status === filter.status);
  return list.sort((a, b) => a.order - b.order);
}

export function getChapterById(id: string): DbChapter | null {
  return readJson<DbChapter>(CHAPTERS).find(c => c.id === id) ?? null;
}

export function getChapterBySlug(terrierId: string, slug: string): DbChapter | null {
  return getChapters(terrierId).find(c => c.slug === slug) ?? null;
}

export function createChapter(
  data: Omit<DbChapter, 'id' | 'createdAt' | 'updatedAt'>,
): DbChapter {
  const list = readJson<DbChapter>(CHAPTERS);
  const chapter: DbChapter = { ...data, id: cuid(), createdAt: now(), updatedAt: now() };
  list.push(chapter);
  writeJson(CHAPTERS, list);
  return chapter;
}

export function updateChapter(
  id: string,
  data: Partial<Omit<DbChapter, 'id' | 'terrierId' | 'createdAt'>>,
): DbChapter {
  const list = readJson<DbChapter>(CHAPTERS);
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) throw new Error(`Chapter ${id} not found`);
  list[idx] = { ...list[idx], ...data, updatedAt: now() };
  writeJson(CHAPTERS, list);
  return list[idx];
}

export function deleteChapter(id: string): void {
  writeJson(CHAPTERS, readJson<DbChapter>(CHAPTERS).filter(c => c.id !== id));
}

export function nextChapterOrder(terrierId: string): number {
  const chapters = getChapters(terrierId);
  return chapters.length ? Math.max(...chapters.map(c => c.order)) + 1 : 1;
}
