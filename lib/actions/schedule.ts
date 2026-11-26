// lib/actions/schedule.ts
'use server'

import { requireAdmin } from '../require-admin';
import { revalidatePath } from 'next/cache'
import { addToSchedule, removeFromSchedule, isSlotTaken, rescheduleEntry } from '../schedule'
import { nextPublicationSlots, parisLocalToUtc } from '../schedule-slots'
import { addNote, updateNote } from '../notes'
import { getAllAdminPosts } from '../posts'
import { getContentStatus, setContentStatus } from '../content-status'

export async function actionAddToSchedule(
  slug: string,
  source: 'fs' | 'db',
  scheduledAt: string
): Promise<void> {
  await requireAdmin();
  addToSchedule(slug, source, scheduledAt)
  setContentStatus(slug, { status: 'scheduled' })
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/review')
}

export async function actionRemoveFromSchedule(scheduleId: string, slug: string): Promise<void> {
  await requireAdmin();
  removeFromSchedule(scheduleId)
  setContentStatus(slug, { status: 'ready' })
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/review')
}

export interface AutoScheduleResult {
  scheduled: { slug: string; scheduledAt: string }[]
  message?: string
}

/**
 * Planifie automatiquement les articles « prêts » sur les prochains créneaux libres
 * (lundi, mercredi, vendredi à 9h, heure de Paris). 3 créneaux = une semaine.
 * Les articles les plus anciens passent en premier.
 */
export async function actionAutoSchedule(count: number = 3): Promise<AutoScheduleResult> {
  await requireAdmin();
  const n = Math.min(Math.max(Math.floor(Number(count)) || 3, 1), 12)

  const ready = getAllAdminPosts()
    .filter(p => getContentStatus(p.slug).status === 'ready')
    .sort((a, b) => (a.date ?? '') < (b.date ?? '') ? -1 : 1)

  if (ready.length === 0) {
    return { scheduled: [], message: "Aucun article « prêt » à planifier. Marquez des articles comme prêts dans « Relecture »." }
  }

  const freeSlots = nextPublicationSlots(60).map(d => d.toISOString()).filter(iso => !isSlotTaken(iso))
  const scheduled: AutoScheduleResult['scheduled'] = []

  for (const post of ready.slice(0, Math.min(n, freeSlots.length))) {
    const scheduledAt = freeSlots[scheduled.length]
    addToSchedule(post.slug, post.source as 'fs' | 'db', scheduledAt)
    setContentStatus(post.slug, { status: 'scheduled' })
    scheduled.push({ slug: post.slug, scheduledAt })
  }

  revalidatePath('/admin/schedule')
  revalidatePath('/admin/review')
  const left = ready.length - scheduled.length
  return { scheduled, message: left > 0 ? `${left} article(s) prêt(s) restent à planifier.` : undefined }
}

export type MoveResult = { ok: true; swappedWith?: string } | { ok: false; error: string }

/** Déplace un article programmé vers un autre créneau (échange s'il est déjà occupé). */
export async function actionRescheduleEntry(id: string, scheduledAt: string): Promise<MoveResult> {
  await requireAdmin();
  const r = rescheduleEntry(id, scheduledAt)
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/notes')
  return r
}

/** Fixe une date et une heure précises (heure de Paris, format AAAA-MM-JJThh:mm). */
export async function actionSetEntryLocalTime(id: string, local: string): Promise<MoveResult> {
  await requireAdmin();
  const date = parisLocalToUtc(String(local))
  if (!date) return { ok: false, error: 'Date ou heure invalide.' }
  const r = rescheduleEntry(id, date.toISOString())
  revalidatePath('/admin/schedule')
  return r
}

/** Note un sujet à venir directement sur un créneau libre : crée une idée dans le carnet, visant ce créneau. */
export async function actionPlanTopic(title: string, slotIso: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const clean = String(title).trim()
  if (!clean) return { ok: false, error: 'Écrivez un sujet.' }
  if (Number.isNaN(new Date(slotIso).getTime())) return { ok: false, error: 'Créneau invalide.' }
  const note = addNote({ title: clean })
  updateNote(note.id, { targetSlot: slotIso, status: 'a_ecrire' })
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/notes')
  return { ok: true }
}

/** Programme un article prêt à une date et une heure précises (heure de Paris). Refuse le passé et un jour déjà pris. */
export async function actionScheduleAtLocal(slug: string, source: 'fs' | 'db', local: string, kind: 'post' | 'course' = 'post'): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const when = parisLocalToUtc(String(local))
  if (!when) return { ok: false, error: 'Date ou heure invalide.' }
  if (when.getTime() <= Date.now()) return { ok: false, error: 'Choisissez une date et une heure à venir.' }
  const iso = when.toISOString()
  if (isSlotTaken(iso)) return { ok: false, error: 'Un article est déjà programmé ce jour-là. Déplacez-le d’abord, ou choisissez un autre jour.' }
  addToSchedule(slug, source === 'db' ? 'db' : 'fs', iso, kind === 'course' ? 'course' : 'post')
  if (kind !== 'course') setContentStatus(slug, { status: 'scheduled' })
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/review')
  revalidatePath('/admin/cours')
  return { ok: true }
}
