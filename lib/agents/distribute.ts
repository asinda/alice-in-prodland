// lib/agents/distribute.ts
import { generateSocialContent } from './social'
import { generateSocialImage, saveSocialImage } from '../social-image'
import { postToLinkedIn } from '../integrations/linkedin'
import { postToInstagram } from '../integrations/instagram'
import { postYoutubeCommunity } from '../integrations/youtube'
import { prepareTikTokPost } from '../integrations/tiktok'
import { updatePost, type DbPost } from '../db'

export async function generateAndDistribute(post: DbPost): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = `${siteUrl}/blog/${post.slug}`

  const [imageBuffer, socialContent] = await Promise.all([
    generateSocialImage({ title: post.title, tags: post.tags }),
    generateSocialContent({ title: post.title, excerpt: post.excerpt, content: post.content, tags: post.tags, url, type: post.type }),
  ])

  const imagePath = saveSocialImage(post.slug, imageBuffer)
  const imageUrl = `${siteUrl}${imagePath}`

  const [linkedin, instagram, youtube, tiktok] = await Promise.all([
    postToLinkedIn({ title: post.title, excerpt: post.excerpt, url, tags: post.tags }),
    postToInstagram({ imageUrl, caption: socialContent.instagram.caption }),
    postYoutubeCommunity({ text: socialContent.youtube.communityPost }),
    prepareTikTokPost({ title: post.title, excerpt: post.excerpt, url, tags: post.tags, type: post.type }),
  ])

  updatePost(post.id, { integrations: { ...post.integrations, linkedin, instagram, youtube, tiktok } })
}
