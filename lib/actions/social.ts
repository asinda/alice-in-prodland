'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '../require-admin'
import { getDraft, updateDraft } from '../social-drafts'
import { publishDraft } from '../agents/distribute'

const MAX_INSTAGRAM = 2200
const MAX_YOUTUBE = 5000

export async function actionApproveDraft(
  id: string,
  instagramCaption: string,
  youtubePost: string
): Promise<{ error?: string }> {
  await requireAdmin()
  const draft = getDraft(id)
  if (!draft) return { error: 'Brouillon introuvable.' }
  if (draft.status === 'posted') return { error: 'Déjà publié.' }
  if (draft.status === 'rejected') return { error: 'Brouillon rejeté.' }

  const ig = instagramCaption.trim()
  const yt = youtubePost.trim()
  if (!ig || !yt) return { error: 'Les textes ne peuvent pas être vides.' }
  if (ig.length > MAX_INSTAGRAM) return { error: `Légende Instagram trop longue (max ${MAX_INSTAGRAM}).` }
  if (yt.length > MAX_YOUTUBE) return { error: `Post YouTube trop long (max ${MAX_YOUTUBE}).` }

  updateDraft(id, { instagramCaption: ig, youtubePost: yt, status: 'pending', error: undefined })
  const result = await publishDraft(id)
  revalidatePath('/admin/social')
  return result.failed ? { error: 'La diffusion a échoué, voir le statut du brouillon.' } : {}
}

export async function actionRejectDraft(id: string): Promise<void> {
  await requireAdmin()
  const draft = getDraft(id)
  if (!draft || draft.status === 'posted') return
  updateDraft(id, { status: 'rejected', decidedAt: new Date().toISOString() })
  revalidatePath('/admin/social')
}
