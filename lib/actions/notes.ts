'use server';

import { requireAdmin } from '../require-admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addNote, updateNote, deleteNote, noteToDraft, parseTags, NOTE_STATUSES, type NoteStatus } from '../notes';

export type NoteState = { error?: string; ok?: boolean; id?: string } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? '');

/** Capture rapide : un titre suffit. */
export async function actionAddNote(_: NoteState, formData: FormData): Promise<NoteState> {
  await requireAdmin();
  const title = str(formData, 'title').trim();
  if (!title) return { error: 'Écrivez au moins un titre.' };
  const note = addNote({ title, body: str(formData, 'body'), tags: parseTags(str(formData, 'tags')) });
  revalidatePath('/admin/notes');
  return { ok: true, id: note.id };
}

export async function actionUpdateNote(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const status = str(formData, 'status');
  try {
    updateNote(id, {
      title: str(formData, 'title'),
      body: str(formData, 'body'),
      tags: parseTags(str(formData, 'tags')),
      status: (NOTE_STATUSES as string[]).includes(status) ? (status as NoteStatus) : undefined,
      starred: formData.get('starred') === 'on',
      targetSlot: str(formData, 'targetSlot'),
    });
  } catch {
    // titre vide : on ignore la modification plutôt que d'effacer la note
  }
  revalidatePath('/admin/notes');
}

export async function actionToggleStar(id: string, starred: boolean): Promise<void> {
  await requireAdmin();
  updateNote(id, { starred });
  revalidatePath('/admin/notes');
}

export async function actionDeleteNote(id: string): Promise<void> {
  await requireAdmin();
  deleteNote(id);
  revalidatePath('/admin/notes');
}

/** Crée le brouillon d'article et ouvre l'éditeur. */
export async function actionNoteToDraft(id: string): Promise<void> {
  await requireAdmin();
  const post = noteToDraft(id);
  revalidatePath('/admin/notes');
  revalidatePath('/admin/posts');
  if (post) redirect(`/admin/posts/${post.id}`);
}

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string }

/** Enregistrement automatique depuis l'éditeur du carnet (appelé après une courte pause de frappe). */
export async function actionSaveNote(
  id: string,
  fields: { title: string; body: string; tags: string; status: string; starred: boolean; targetSlot: string },
): Promise<SaveResult> {
  await requireAdmin();
  if (!String(fields.title).trim()) return { ok: false, error: 'Le titre ne peut pas être vide.' }
  try {
    const status = (NOTE_STATUSES as string[]).includes(fields.status) ? (fields.status as NoteStatus) : undefined
    const saved = updateNote(id, {
      title: String(fields.title), body: String(fields.body), tags: parseTags(String(fields.tags)),
      status, starred: !!fields.starred, targetSlot: String(fields.targetSlot ?? ''),
    })
    if (!saved) return { ok: false, error: 'Note introuvable.' }
    revalidatePath('/admin/notes')
    return { ok: true, savedAt: saved.updatedAt }
  } catch {
    return { ok: false, error: 'Échec de l’enregistrement.' }
  }
}
