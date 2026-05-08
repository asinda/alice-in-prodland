import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

// ─── Types ──────────────────────────────────────────────────────────────────

export type ContentType = 'post' | 'tutorial';
export type Status = 'draft' | 'published';
export type IntegrationStatus = 'idle' | 'success' | 'error' | 'skipped';

export interface IntegrationResult {
  status: IntegrationStatus;
  url?: string;
  id?: string;
  error?: string;
  pushedAt?: string;
}

export interface Integrations {
  linkedin: IntegrationResult;
  gumroad: IntegrationResult;
  tiktok: IntegrationResult;
}

const defaultIntegrations = (): Integrations => ({
  linkedin: { status: 'idle' },
  gumroad: { status: 'idle' },
  tiktok: { status: 'idle' },
});

export interface DbPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  type: ContentType;
  status: Status;
  publishedAt: string | null;
  integrations: Integrations;
  createdAt: string;
  updatedAt: string;
}

export interface DbLesson {
  id: string;
  slug: string;
  title: string;
  content: string;
  order: number;
}

export interface DbCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  status: Status;
  publishedAt: string | null;
  gumroadUrl: string;
  lessons: DbLesson[];
  integrations: Integrations;
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
  const p = path.join(dataDir, file);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T[];
}

function writeJson<T>(file: string, data: T[]): void {
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2));
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export function getPosts(filter?: { status?: Status; type?: ContentType }): DbPost[] {
  let posts = readJson<DbPost>('posts.json');
  if (filter?.status) posts = posts.filter(p => p.status === filter.status);
  if (filter?.type) posts = posts.filter(p => p.type === filter.type);
  return posts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getPostById(id: string): DbPost | null {
  return getPosts().find(p => p.id === id) ?? null;
}

export function getPostBySlug(slug: string): DbPost | null {
  return getPosts().find(p => p.slug === slug) ?? null;
}

export function createPost(data: Omit<DbPost, 'id' | 'createdAt' | 'updatedAt' | 'integrations'>): DbPost {
  const posts = readJson<DbPost>('posts.json');
  const post: DbPost = { ...data, integrations: defaultIntegrations(), id: cuid(), createdAt: now(), updatedAt: now() };
  posts.push(post);
  writeJson('posts.json', posts);
  return post;
}

export function updatePost(id: string, data: Partial<Omit<DbPost, 'id' | 'createdAt'>>): DbPost {
  const posts = readJson<DbPost>('posts.json');
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Post ${id} not found`);
  posts[idx] = { ...posts[idx], ...data, updatedAt: now() };
  writeJson('posts.json', posts);
  return posts[idx];
}

export function deletePost(id: string): void {
  const posts = readJson<DbPost>('posts.json').filter(p => p.id !== id);
  writeJson('posts.json', posts);
}

export function publishPost(id: string): DbPost {
  return updatePost(id, { status: 'published', publishedAt: now() });
}

export function unpublishPost(id: string): DbPost {
  return updatePost(id, { status: 'draft', publishedAt: null });
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export function getCourses(filter?: { status?: Status }): DbCourse[] {
  let courses = readJson<DbCourse>('courses.json');
  if (filter?.status) courses = courses.filter(c => c.status === filter.status);
  return courses.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getCourseById(id: string): DbCourse | null {
  return getCourses().find(c => c.id === id) ?? null;
}

export function getCourseBySlug(slug: string): DbCourse | null {
  return getCourses().find(c => c.slug === slug) ?? null;
}

export function createCourse(data: Omit<DbCourse, 'id' | 'lessons' | 'createdAt' | 'updatedAt' | 'integrations'>): DbCourse {
  const courses = readJson<DbCourse>('courses.json');
  const course: DbCourse = { ...data, integrations: defaultIntegrations(), id: cuid(), lessons: [], createdAt: now(), updatedAt: now() };
  courses.push(course);
  writeJson('courses.json', courses);
  return course;
}

export function updateCourse(id: string, data: Partial<Omit<DbCourse, 'id' | 'createdAt'>>): DbCourse {
  const courses = readJson<DbCourse>('courses.json');
  const idx = courses.findIndex(c => c.id === id);
  if (idx === -1) throw new Error(`Course ${id} not found`);
  courses[idx] = { ...courses[idx], ...data, updatedAt: now() };
  writeJson('courses.json', courses);
  return courses[idx];
}

export function deleteCourse(id: string): void {
  const courses = readJson<DbCourse>('courses.json').filter(c => c.id !== id);
  writeJson('courses.json', courses);
}

export function publishCourse(id: string): DbCourse {
  return updateCourse(id, { status: 'published', publishedAt: now() });
}

// ─── Lessons ─────────────────────────────────────────────────────────────────

export function addLesson(courseId: string, data: Omit<DbLesson, 'id'>): DbLesson {
  const courses = readJson<DbCourse>('courses.json');
  const idx = courses.findIndex(c => c.id === courseId);
  if (idx === -1) throw new Error(`Course ${courseId} not found`);
  const lesson: DbLesson = { ...data, id: cuid() };
  courses[idx].lessons.push(lesson);
  courses[idx].lessons.sort((a, b) => a.order - b.order);
  courses[idx].updatedAt = now();
  writeJson('courses.json', courses);
  return lesson;
}

export function updateLesson(courseId: string, lessonId: string, data: Partial<Omit<DbLesson, 'id'>>): DbLesson {
  const courses = readJson<DbCourse>('courses.json');
  const ci = courses.findIndex(c => c.id === courseId);
  if (ci === -1) throw new Error(`Course ${courseId} not found`);
  const li = courses[ci].lessons.findIndex(l => l.id === lessonId);
  if (li === -1) throw new Error(`Lesson ${lessonId} not found`);
  courses[ci].lessons[li] = { ...courses[ci].lessons[li], ...data };
  courses[ci].updatedAt = now();
  writeJson('courses.json', courses);
  return courses[ci].lessons[li];
}

export function deleteLesson(courseId: string, lessonId: string): void {
  const courses = readJson<DbCourse>('courses.json');
  const ci = courses.findIndex(c => c.id === courseId);
  if (ci === -1) throw new Error(`Course ${courseId} not found`);
  courses[ci].lessons = courses[ci].lessons.filter(l => l.id !== lessonId);
  courses[ci].updatedAt = now();
  writeJson('courses.json', courses);
}
