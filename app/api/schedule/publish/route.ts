// app/api/schedule/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { claimNextPending, hasPublishedSince, markPublished, markFailed } from '@/lib/schedule'
import { setContentStatus } from '@/lib/content-status'
import { revalidatePath } from 'next/cache'
import { getPostBySlug, publishPost, createPost, getCourseBySlug, publishCourse } from '@/lib/db'
import { getFsPostRaw } from '@/lib/posts'
import { generateAndDistribute, prepareSocialDraft, isAutoPostEnabled } from '@/lib/agents/distribute'

function verifyToken(req: NextRequest): boolean {
  const secret = process.env.PUBLISH_SECRET
  if (!secret) return false
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  } catch {
    return false
  }
}

/** Les pages publiques sont mises en cache : sans ceci, un article ou un cours programmé n'apparaîtrait qu'au prochain déploiement. */
function refreshSite(): void {
  try { revalidatePath('/', 'layout') } catch { /* hors contexte Next (tests) */ }
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Le cron se déclenche deux fois par jour de publication (heure d'été/hiver) : une seule publication par créneau
  if (hasPublishedSince(6 * 60 * 60 * 1000)) return NextResponse.json({ status: 'cooldown' })

  const entry = claimNextPending()
  if (!entry) return NextResponse.json({ status: 'no_pending' })

  try {
    // Cours programmé : on le met en ligne (pas de diffusion sociale pour les cours)
    if (entry.kind === 'course') {
      const course = getCourseBySlug(entry.slug)
      if (!course) throw new Error(`Cours introuvable : ${entry.slug}`)
      if (course.status !== 'published') publishCourse(course.id)
      markPublished(entry.id)
      refreshSite()
      return NextResponse.json({ status: 'published_course', slug: entry.slug })
    }

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

    // Ne pas republier (ni changer publishedAt) si le post l'est déjà (reprise après échec partiel)
    if (post.status !== 'published') publishPost(post.id)
    const published = getPostBySlug(entry.slug)!
    if (!isAutoPostEnabled()) {
      // Validation humaine : on prépare un brouillon, rien n'est posté avant approbation dans /admin/social
      try {
        await prepareSocialDraft(published)
      } catch (e) {
        console.error('[publish-webhook] Draft generation failed:', e)
        markFailed(entry.id, 'Génération du brouillon social en échec (post publié)')
        return NextResponse.json({ status: 'published_draft_failed', slug: entry.slug }, { status: 502 })
      }
      markPublished(entry.id)
      refreshSite()
      return NextResponse.json({ status: 'published_pending_approval', slug: entry.slug })
    }

    const dist = await generateAndDistribute(published)

    if (dist?.failed) {
      markFailed(entry.id, 'Distribution sociale en échec (post publié, relancer depuis admin)')
      return NextResponse.json({ status: 'published_distribution_failed', slug: entry.slug }, { status: 502 })
    }

    markPublished(entry.id)
    refreshSite()
    setContentStatus(entry.slug, { status: 'distributed' })

    return NextResponse.json({ status: 'published', slug: entry.slug })
  } catch (e) {
    markFailed(entry.id, String(e))
    console.error('[publish-webhook] Failed:', e)
    return NextResponse.json({ status: 'error', error: 'Internal publish error' }, { status: 500 })
  }
}
