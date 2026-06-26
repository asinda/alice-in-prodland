// lib/actions/review.ts
'use server'
import { revalidatePath } from 'next/cache'
import { getContentStatus, setContentStatus } from '../content-status'
import { improvePost } from '../agents/improve'
import { getPost } from '../posts'
import { getPostBySlug, updatePost } from '../db'
import type { ImproveOutput } from '../agents/improve'

export async function actionMarkReady(slug: string): Promise<void> {
  setContentStatus(slug, { status: 'ready', reviewedAt: new Date().toISOString() })
  revalidatePath('/admin/review')
}

export async function actionImproveWithAI(slug: string): Promise<ImproveOutput> {
  const post = await getPost(slug)
  const dbPost = getPostBySlug(slug)
  const result = await improvePost({
    slug,
    title: post.title,
    excerpt: post.excerpt,
    content: dbPost?.content ?? post.contentHtml,
    tags: post.tags,
  })
  setContentStatus(slug, {
    aiImprovedTitle: result.improvedTitle,
    aiImprovedExcerpt: result.improvedExcerpt,
    aiSuggestions: result.suggestions,
    aiAddedTags: result.addedTags,
  })
  revalidatePath('/admin/review')
  return result
}

export async function actionAcceptImprovement(slug: string): Promise<void> {
  const status = getContentStatus(slug)
  if (!status.aiImprovedTitle) return
  const dbPost = getPostBySlug(slug)
  if (dbPost) {
    updatePost(dbPost.id, {
      title: status.aiImprovedTitle,
      excerpt: status.aiImprovedExcerpt ?? dbPost.excerpt,
      tags: [...new Set([...dbPost.tags, ...(status.aiAddedTags ?? [])])],
    })
  }
  setContentStatus(slug, { status: 'ready', reviewedAt: new Date().toISOString() })
  revalidatePath('/admin/review')
}
