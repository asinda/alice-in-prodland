import path from 'path';
import { readJsonFile, writeJsonFile } from './jsonStore';
import { createPost, getPostById, getPostBySlug, type DbPost } from './db';

/**
 * Carnet d'idées : sujets futurs, notes de travail, plan éditorial.
 * Cycle : idée → à écrire → en cours (un brouillon existe) → écrit. Les notes restent privées (data/notes.json, hors dépôt).
 */
export type NoteStatus = 'idee' | 'a_ecrire' | 'en_cours' | 'ecrit';
export const NOTE_STATUSES: NoteStatus[] = ['idee', 'a_ecrire', 'en_cours', 'ecrit'];

export interface Note {
  id: string;
  title: string;
  /** Notes libres en Markdown : plan, liens, commandes à tester, angle. */
  body: string;
  tags: string[];
  status: NoteStatus;
  /** Sujet à traiter en priorité. */
  starred: boolean;
  /** Créneau de publication visé (instant UTC, ISO). Indicatif : la programmation reste faite dans le calendrier. */
  targetSlot?: string;
  /** Brouillon créé à partir de la note. */
  postId?: string;
  createdAt: string;
  updatedAt: string;
}

const dataFile = () => path.join(process.cwd(), 'data', 'notes.json');
const now = () => new Date().toISOString();
const cuid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const MAX_TITLE = 200;
const MAX_BODY = 20000;

function readAll(): Note[] {
  return readJsonFile<Note[]>(dataFile(), []);
}
function writeAll(notes: Note[]): void {
  writeJsonFile(dataFile(), notes);
}

export function parseTags(raw: string): string[] {
  return [...new Set(raw.split(',').map(t => t.trim()).filter(Boolean))].slice(0, 12);
}

const isStatus = (v: unknown): v is NoteStatus => (NOTE_STATUSES as unknown[]).includes(v);

/** Notes triées : à traiter d'abord (étoilées), puis par avancement, puis par modification récente. */
export function getNotes(): Note[] {
  return readAll().sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    const sa = NOTE_STATUSES.indexOf(a.status), sb = NOTE_STATUSES.indexOf(b.status);
    if (sa !== sb) return sa - sb;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function getNote(id: string): Note | null {
  return readAll().find(n => n.id === id) ?? null;
}

export function addNote(input: { title: string; body?: string; tags?: string[] }): Note {
  const title = input.title.trim().slice(0, MAX_TITLE);
  if (!title) throw new Error('Le titre est requis');
  const note: Note = {
    id: cuid(), title, body: (input.body ?? '').slice(0, MAX_BODY), tags: input.tags ?? [],
    status: 'idee', starred: false, createdAt: now(), updatedAt: now(),
  };
  writeAll([...readAll(), note]);
  return note;
}

export interface NotePatch {
  title?: string; body?: string; tags?: string[]; status?: NoteStatus; starred?: boolean;
  /** Chaîne vide : retire le créneau visé. */
  targetSlot?: string;
}

export function updateNote(id: string, patch: NotePatch): Note | null {
  const all = readAll();
  const i = all.findIndex(n => n.id === id);
  if (i === -1) return null;
  const cur = all[i];
  const next: Note = { ...cur, updatedAt: now() };
  if (patch.title !== undefined) {
    const title = patch.title.trim().slice(0, MAX_TITLE);
    if (!title) throw new Error('Le titre est requis');
    next.title = title;
  }
  if (patch.body !== undefined) next.body = patch.body.slice(0, MAX_BODY);
  if (patch.tags !== undefined) next.tags = patch.tags;
  if (patch.status !== undefined && isStatus(patch.status)) next.status = patch.status;
  if (patch.starred !== undefined) next.starred = patch.starred;
  if (patch.targetSlot !== undefined) {
    if (patch.targetSlot === '') delete next.targetSlot;
    else if (!Number.isNaN(new Date(patch.targetSlot).getTime())) next.targetSlot = new Date(patch.targetSlot).toISOString();
  }
  all[i] = next;
  writeAll(all);
  return next;
}

export function deleteNote(id: string): void {
  writeAll(readAll().filter(n => n.id !== id));
}

/** Crée un brouillon d'article à partir de la note, puis la fait passer « en cours ». Un second appel renvoie le brouillon existant. */
export function noteToDraft(id: string): DbPost | null {
  const note = getNote(id);
  if (!note) return null;
  const existing = note.postId ? getPostById(note.postId) : null;
  if (existing) return existing;
  const base = note.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `note-${note.id}`;
  const slug = getPostBySlug(base) ? `${base}-${note.id.slice(-4)}` : base;
  const post = createPost({
    slug,
    title: note.title,
    excerpt: '',
    content: `# ${note.title}\n\n${note.body}`.trimEnd() + '\n',
    tags: note.tags,
    type: 'post',
    status: 'draft',
    publishedAt: null,
  });
  updateNote(id, { status: 'en_cours' });
  const all = readAll();
  const i = all.findIndex(n => n.id === id);
  if (i !== -1) { all[i] = { ...all[i], postId: post.id }; writeAll(all); }
  return post;
}

export interface PlanRow {
  slot: string;
  /** Titre de l'article déjà programmé sur ce créneau, s'il y en a un. */
  scheduledTitle?: string;
  /** Idée qui vise ce créneau. */
  note?: Note;
}

/** Plan éditorial : chaque créneau à venir avec ce qui y est programmé, ou l'idée visée, ou rien (libre). */
export function buildPlan(slots: string[], scheduled: { scheduledAt: string; title: string }[], notes: Note[]): PlanRow[] {
  return slots.map(slot => {
    const day = slot.slice(0, 10);
    const sch = scheduled.find(s => s.scheduledAt.slice(0, 10) === day);
    const note = notes.find(n => n.targetSlot && n.targetSlot.slice(0, 10) === day && n.status !== 'ecrit');
    return { slot, scheduledTitle: sch?.title, note };
  });
}
