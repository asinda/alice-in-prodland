// lib/actions/review.ts
'use server'
import { revalidatePath } from 'next/cache'
import { getContentStatus, setContentStatus } from '../content-status'
import { improvePost } from '../agents/improve'
import { getFsPostRaw } from '../posts'
import { getPostBySlug, updatePost } from '../db'
import type { ImproveOutput } from '../agents/improve'

export async function actionMarkReady(slug: string): Promise<void> {
  setContentStatus(slug, { status: 'ready', reviewedAt: new Date().toISOString() })
  revalidatePath('/admin/review')
}

export async function actionImproveWithAI(slug: string): Promise<ImproveOutput> {
  // Use getPostBySlug for DB posts (works for drafts), getFsPostRaw for FS-only posts
  const dbPost = getPostBySlug(slug)
  const fsPost = !dbPost ? getFsPostRaw(slug) : null

  const title = dbPost?.title ?? fsPost?.title ?? slug
  const excerpt = dbPost?.excerpt ?? fsPost?.excerpt ?? ''
  const content = dbPost?.content ?? fsPost?.content ?? ''
  const tags = dbPost?.tags ?? fsPost?.tags ?? []

  const result = await improvePost({ slug, title, excerpt, content, tags })
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
