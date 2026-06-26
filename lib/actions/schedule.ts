// lib/actions/schedule.ts
'use server'
import { revalidatePath } from 'next/cache'
import { addToSchedule, removeFromSchedule } from '../schedule'
import { setContentStatus } from '../content-status'

export async function actionAddToSchedule(
  slug: string,
  source: 'fs' | 'db',
  scheduledAt: string
): Promise<void> {
  addToSchedule(slug, source, scheduledAt)
  setContentStatus(slug, { status: 'scheduled' })
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/review')
}

export async function actionRemoveFromSchedule(scheduleId: string, slug: string): Promise<void> {
  removeFromSchedule(scheduleId)
  setContentStatus(slug, { status: 'ready' })
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/review')
}
