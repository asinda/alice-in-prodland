// app/api/schedule/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getNextPending, markPublished, markFailed } from '@/lib/schedule'
import { setContentStatus } from '@/lib/content-status'
import { getPostBySlug, publishPost, createPost } from '@/lib/db'
import { getFsPostRaw } from '@/lib/posts'
import { generateAndDistribute } from '@/lib/agents/distribute'

function verifyToken(req: NextRequest): boolean {
  const secret = process.env.PUBLISH_SECRET
  if (!secret) return false
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const entry = getNextPending()
  if (!entry) return NextResponse.json({ status: 'no_pending' })

  try {
    let post = getPostBySlug(entry.slug)

    if (!post && entry.source === 'fs') {
      const raw = getFsPostRaw(entry.slug)
      if (!raw) throw new Error(`FS post introuvable : ${entry.slug}`)
      post = createPost({
        slug: entry.slug, title: raw.title, excerpt: raw.excerpt, content: raw.content,
        tags: raw.tags, type: 'post', status: 'draft', publishedAt: null,
      })
    }

    if (!post) throw new Error(`Post introuvable : ${entry.slug}`)

    publishPost(post.id)
    const published = getPostBySlug(entry.slug)!
    await generateAndDistribute(published)

    markPublished(entry.id)
    setContentStatus(entry.slug, { status: 'distributed' })

    return NextResponse.json({ status: 'published', slug: entry.slug })
  } catch (e) {
    markFailed(entry.id, String(e))
    return NextResponse.json({ status: 'error', error: String(e) }, { status: 500 })
  }
}
