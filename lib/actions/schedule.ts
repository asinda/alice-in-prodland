// lib/actions/schedule.ts
'use server'

import { requireAdmin } from '../require-admin';
import { revalidatePath } from 'next/cache'
import { addToSchedule, removeFromSchedule, isSlotTaken } from '../schedule'
import { nextPublicationSlots } from '../schedule-slots'
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
