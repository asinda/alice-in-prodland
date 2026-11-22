// app/admin/review/ReviewClient.tsx
'use client'
import { useState, useTransition } from 'react'
import { actionMarkReady, actionImproveWithAI, actionAcceptImprovement, actionTechReview } from '@/lib/actions/review'
import type { TechReviewOutput } from '@/lib/agents/techreview'
import type { AdminPostRow } from '@/lib/posts'
import type { ContentStatus } from '@/lib/content-status'

type PostWithStatus = AdminPostRow & { contentStatus: ContentStatus }

function PostRow({ post }: { post: PostWithStatus }) {
  const [isPending, startTransition] = useTransition()
  const hasAI = !!post.contentStatus.aiImprovedTitle
  const [review, setReview] = useState<TechReviewOutput | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)

  return (
    <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <p style={{ color: '#f1f5f9', fontWeight: 'bold', margin: 0 }}>{post.title}</p>
          {hasAI && (
            <p style={{ color: '#22c55e', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              IA → {post.contentStatus.aiImprovedTitle}
            </p>
          )}
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
            {post.slug} · {post.source}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button
            disabled={isPending}
            onClick={() => startTransition(async () => {
              setReviewError(null)
              const r = await actionTechReview(post.slug)
              if (r.error) setReviewError(r.error)
              else setReview(r.result ?? null)
            })}
            style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {isPending ? '...' : '🔍 Relecture'}
          </button>
          {!hasAI && (
            <button
              disabled={isPending}
              onClick={() => startTransition(async () => { await actionImproveWithAI(post.slug) })}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {isPending ? '...' : '✦ IA'}
            </button>
          )}
          {hasAI && (
            <button
              onClick={() => startTransition(() => actionAcceptImprovement(post.slug))}
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ✓ Accepter
            </button>
          )}
          <button
            onClick={() => startTransition(() => actionMarkReady(post.slug))}
            style={{ background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Prêt
          </button>
        </div>
      </div>
      {reviewError && <p role="alert" style={{ color: '#f87171', marginTop: '0.75rem' }}>{reviewError}</p>}
      {review && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
          <p style={{ color: '#cbd5e1', margin: '0 0 0.5rem' }}>{review.summary}</p>
          {review.findings.length === 0 && <p style={{ color: '#22c55e', margin: 0 }}>Aucun problème détecté.</p>}
          {review.findings.map((f, i) => (
            <div key={i} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: f.severity === 'erreur' ? '#f87171' : f.severity === 'risque' ? '#fbbf24' : '#94a3b8', fontWeight: 'bold' }}>
                [{f.severity}]
              </span>{' '}
              <span style={{ color: '#94a3b8' }}>{f.line ? `ligne ${f.line} · ` : ''}</span>
              <span style={{ color: '#e2e8f0' }}>{f.problem}</span>
              <div style={{ color: '#64748b' }}>« {f.excerpt} »</div>
              <div style={{ color: '#38bdf8' }}>→ {f.suggestion}</div>
            </div>
          ))}
          <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>Suggestions de l&apos;IA : à vérifier avant toute modification.</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, posts, color }: { title: string; posts: PostWithStatus[]; color: string }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ color, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
        {title} ({posts.length})
      </h2>
      {posts.length === 0
        ? <p style={{ color: '#475569', fontSize: '0.85rem' }}>Aucun post</p>
        : posts.map(p => <PostRow key={p.slug} post={p} />)
      }
    </div>
  )
}

export default function ReviewClient({ unreviewed, ready, scheduled }: {
  unreviewed: PostWithStatus[]
  ready: PostWithStatus[]
  scheduled: PostWithStatus[]
}) {
  return (
    <div>
      <Section title="À réviser" posts={unreviewed} color="#f59e0b" />
      <Section title="Prêts" posts={ready} color="#22c55e" />
      <Section title="Schedulés" posts={scheduled} color="#3b82f6" />
    </div>
  )
}
