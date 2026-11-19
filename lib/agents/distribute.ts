// lib/agents/distribute.ts
import { generateSocialContent } from './social'
import { generateSocialImage, saveSocialImage } from '../social-image'
import { postToLinkedIn } from '../integrations/linkedin'
import { postToInstagram } from '../integrations/instagram'
import { postYoutubeCommunity } from '../integrations/youtube'
import { prepareTikTokPost } from '../integrations/tiktok'
import { getPostById, updatePost, type DbPost } from '../db'

export interface DistributeResult {
  /** true si la génération/diffusion a levé une erreur ou si toutes les plateformes ont échoué */
  failed: boolean
}

const PLATFORMS = ['linkedin', 'instagram', 'youtube'] as const

export async function generateAndDistribute(post: DbPost): Promise<DistributeResult> {
  // Idempotence : si toutes les plateformes automatiques ont déjà réussi, ne rien reposter.
  if (PLATFORMS.every(p => post.integrations?.[p]?.status === 'success')) {
    return { failed: false }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = `${siteUrl}/blog/${post.slug}`

  try {
    const [imageBuffer, socialContent] = await Promise.all([
      generateSocialImage({ title: post.title, tags: post.tags }),
      generateSocialContent({ title: post.title, excerpt: post.excerpt, content: post.content, tags: post.tags, url, type: post.type }),
    ])

    const imagePath = saveSocialImage(post.slug, imageBuffer)
    const imageUrl = `${siteUrl}${imagePath}`

    const done = (p: typeof PLATFORMS[number]) => post.integrations?.[p]?.status === 'success'
    const [linkedin, instagram, youtube, tiktok] = await Promise.all([
      done('linkedin') ? post.integrations.linkedin : postToLinkedIn({ title: post.title, excerpt: post.excerpt, url, tags: post.tags }),
      done('instagram') ? post.integrations.instagram : postToInstagram({ imageUrl, caption: socialContent.instagram.caption }),
      done('youtube') ? post.integrations.youtube : postYoutubeCommunity({ text: socialContent.youtube.communityPost }),
      prepareTikTokPost({ title: post.title, excerpt: post.excerpt, url, tags: post.tags, type: post.type }),
    ])

    // Re-read post to avoid lost-update on integrations (I2)
    const freshPost = getPostById(post.id)
    if (freshPost) {
      updatePost(post.id, { integrations: { ...freshPost.integrations, linkedin, instagram, youtube, tiktok } })
    }
    const results = [linkedin, instagram, youtube]
    // 'skipped' (identifiants absents) n'est pas un échec ; tout en 'error' en est un.
    return { failed: results.every(r => r.status === 'error') }
  } catch (e) {
    // Le post est déjà publié : on ne relance pas, mais on signale l'échec à l'appelant.
    console.error(`[distribute] Failed for ${post.slug}:`, e)
    return { failed: true }
  }
}
