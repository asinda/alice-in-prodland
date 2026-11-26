import { getVaultEntries, readVaultFile, cleanObsidianMarkdown, extractTitle } from './obsidian';
import {
  createCourse, addLesson, getCourseById, getCourseBySlug, createPost, getPostBySlug,
  type DbCourse, type DbLesson, type DbPost,
} from './db';

/**
 * Import de notes vers le site : une note devient un article (brouillon) ou une leçon, et un dossier de notes devient un cours.
 * Tout est créé en brouillon : rien n'est publié sans relecture.
 */
export const MAX_LESSONS = 60;
/** Taille maximale d'une note collée ou téléversée (≈ 500 Ko de texte). */
export const MAX_NOTE_BYTES = 500_000;

export const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'note';

const nextOrder = (c: DbCourse) => (c.lessons.length ? Math.max(...c.lessons.map(l => l.order)) + 1 : 0);

function uniqueLessonSlug(c: DbCourse, base: string): string {
  const taken = new Set(c.lessons.map(l => l.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export interface NoteText { title: string; content: string }

/** Ajoute un texte comme leçon à la fin d'un cours existant. Renvoie null si le cours n'existe pas ou si le texte est vide. */
export function importTextAsLesson(note: NoteText, courseId: string): DbLesson | null {
  const course = getCourseById(courseId);
  const content = note.content.trim();
  if (!course || !content) return null;
  const title = note.title.trim() || 'Nouvelle leçon';
  return addLesson(courseId, { slug: uniqueLessonSlug(course, slugify(title)), title, content: `${content}\n`, order: nextOrder(course) });
}

/** Ajoute une note du vault Obsidian comme leçon d'un cours. */
export function importFileAsLesson(filePath: string, courseId: string): DbLesson | null {
  const raw = readVaultFile(filePath);
  return importTextAsLesson(
    { title: extractTitle(raw, (filePath.split('/').pop() ?? filePath).replace(/\.md$/i, '')), content: cleanObsidianMarkdown(raw) },
    courseId,
  );
}

/** Crée un article en brouillon à partir d'un texte (note collée ou téléversée). */
export function importTextAsPost(note: NoteText): DbPost | null {
  const content = note.content.trim();
  if (!content) return null;
  const title = note.title.trim() || 'Note importée';
  const base = slugify(title);
  const slug = getPostBySlug(base) ? `${base}-${Date.now().toString(36).slice(-4)}` : base;
  return createPost({ slug, title, excerpt: '', content: `${content}\n`, tags: [], type: 'post', status: 'draft', publishedAt: null });
}

export interface FolderImport { course: DbCourse; imported: number; skipped: string[] }

/**
 * Crée un cours en brouillon à partir d'un dossier du vault : chaque note « .md » du dossier devient une leçon,
 * dans l'ordre naturel des noms (01, 02, … 10). Les notes vides sont ignorées et signalées. Sous-dossiers non parcourus.
 */
export function importFolderAsCourse(dir: string, title?: string): FolderImport | null {
  const files = getVaultEntries(dir)
    .filter(e => e.type === 'file' && /\.md$/i.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
    .slice(0, MAX_LESSONS);
  if (files.length === 0) return null;

  const folderName = dir.split('/').filter(Boolean).pop() ?? 'Nouveau cours';
  const courseTitle = (title ?? '').trim() || folderName;
  const base = slugify(courseTitle);
  const course = createCourse({
    slug: getCourseBySlug(base) ? `${base}-${Date.now().toString(36).slice(-4)}` : base,
    title: courseTitle, description: '', tags: [], status: 'draft', publishedAt: null, gumroadUrl: '',
  });

  const skipped: string[] = [];
  let imported = 0;
  for (const f of files) {
    const raw = readVaultFile(f.relativePath);
    const content = cleanObsidianMarkdown(raw).trim();
    if (!content) { skipped.push(f.name); continue; }
    const lessonTitle = extractTitle(raw, f.name.replace(/\.md$/i, ''));
    const current = getCourseById(course.id)!;
    addLesson(course.id, { slug: uniqueLessonSlug(current, slugify(lessonTitle)), title: lessonTitle, content: `${content}\n`, order: imported });
    imported += 1;
  }
  return { course: getCourseById(course.id)!, imported, skipped };
}
