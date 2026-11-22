// lib/agents/distribute.ts
import { generateSocialContent } from './social'
import { generateSocialImage, saveSocialImage } from '../social-image'
import { postToLinkedIn } from '../integrations/linkedin'
import { postToInstagram } from '../integrations/instagram'
import { postYoutubeCommunity } from '../integrations/youtube'
import { prepareTikTokPost } from '../integrations/tiktok'
import { getPostById, updatePost, type DbPost } from '../db'
import { setContentStatus } from '../content-status'
import { getSettings } from '../settings'
import { createDraft, getDraft, getOpenDraftForPost, updateDraft, type SocialDraft } from '../social-drafts'

export interface DistributeResult {
  /** true si la génération/diffusion a levé une erreur ou si toutes les plateformes ont échoué */
  failed: boolean
}

const PLATFORMS = ['linkedin', 'instagram', 'youtube'] as const

/**
 * Par défaut, rien n'est posté sans validation humaine. La publication automatique s'active
 * dans /admin/social (réglage enregistré) ou avec SOCIAL_AUTO_POST=true.
 */
export function isAutoPostEnabled(): boolean {
  if (process.env.SOCIAL_AUTO_POST === 'true') return true
  try {
    return getSettings().autoPost
  } catch {
    return false // réglage illisible : on reste en mode validation humaine
  }
}

/** Génère image + textes IA et les enregistre comme brouillon à valider. Ne poste rien. */
export async function prepareSocialDraft(post: DbPost): Promise<SocialDraft> {
  const existing = getOpenDraftForPost(post.id)
  if (existing) return existing

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = `${siteUrl}/blog/${post.slug}`

  const [imageBuffer, content] = await Promise.all([
    generateSocialImage({ title: post.title, tags: post.tags }),
    generateSocialContent({ title: post.title, excerpt: post.excerpt, content: post.content, tags: post.tags, url, type: post.type }),
  ])
  const imagePath = saveSocialImage(post.slug, imageBuffer)

  return createDraft({
    postId: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    url,
    imageUrl: `${siteUrl}${imagePath}`,
    linkedinTeaser: content.linkedin.text,
    instagramCaption: content.instagram.caption,
    youtubePost: content.youtube.communityPost,
  })
}

/** Poste un brouillon approuvé. Idempotent : saute les plateformes déjà en succès. */
export async function publishDraft(draftId: string): Promise<DistributeResult> {
  const draft = getDraft(draftId)
  if (!draft) return { failed: true }
  if (draft.status === 'posted') return { failed: false }
  if (draft.status === 'rejected') return { failed: true }

  const post = getPostById(draft.postId)
  if (!post) {
    updateDraft(draftId, { status: 'failed', error: 'Post introuvable' })
    return { failed: true }
  }

  try {
    const done = (p: typeof PLATFORMS[number]) => post.integrations?.[p]?.status === 'success'
    const [linkedin, instagram, youtube, tiktok] = await Promise.all([
      done('linkedin') ? post.integrations.linkedin : postToLinkedIn({ title: post.title, excerpt: post.excerpt, url: draft.url, tags: post.tags, text: draft.linkedinTeaser }),
      done('instagram') ? post.integrations.instagram : postToInstagram({ imageUrl: draft.imageUrl, caption: draft.instagramCaption }),
      done('youtube') ? post.integrations.youtube : postYoutubeCommunity({ text: draft.youtubePost }),
      prepareTikTokPost({ title: post.title, excerpt: post.excerpt, url: draft.url, tags: post.tags, type: post.type }),
    ])

    // Relecture du post pour ne pas écraser une modification concurrente des intégrations
    const fresh = getPostById(post.id)
    if (fresh) updatePost(post.id, { integrations: { ...fresh.integrations, linkedin, instagram, youtube, tiktok } })

    const failed = [linkedin, instagram, youtube].every(r => r.status === 'error')
    updateDraft(draftId, {
      status: failed ? 'failed' : 'posted',
      decidedAt: new Date().toISOString(),
      error: failed ? 'Toutes les plateformes ont échoué' : undefined,
    })
    if (!failed) setContentStatus(draft.slug, { status: 'distributed' })
    return { failed }
  } catch (e) {
    console.error(`[distribute] Failed for ${draft.slug}:`, e)
    updateDraft(draftId, { status: 'failed', error: 'Erreur de diffusion (voir les logs serveur)' })
    return { failed: true }
  }
}

/** Mode automatique (SOCIAL_AUTO_POST=true) : brouillon puis publication immédiate. */
export async function generateAndDistribute(post: DbPost): Promise<DistributeResult> {
  if (PLATFORMS.every(p => post.integrations?.[p]?.status === 'success')) return { failed: false }
  try {
    const draft = await prepareSocialDraft(post)
    return await publishDraft(draft.id)
  } catch (e) {
    console.error(`[distribute] Failed for ${post.slug}:`, e)
    return { failed: true }
  }
}
