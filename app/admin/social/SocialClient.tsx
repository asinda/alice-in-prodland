'use client'

import { useState, useTransition } from 'react'
import { actionApproveDraft, actionRejectDraft } from '@/lib/actions/social'
import type { SocialDraft } from '@/lib/social-drafts'

const card = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '1rem', marginBottom: '1rem' } as const
const area = { width: '100%', minHeight: 110, background: '#020617', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '0.5rem', fontFamily: 'inherit' } as const
const label = { color: '#94a3b8', fontSize: '0.8rem', display: 'block', margin: '0.75rem 0 0.25rem' } as const

function DraftCard({ draft }: { draft: SocialDraft }) {
  const [ig, setIg] = useState(draft.instagramCaption)
  const [yt, setYt] = useState(draft.youtubePost)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const approve = () => startTransition(async () => {
    setError(null)
    const res = await actionApproveDraft(draft.id, ig, yt)
    if (res.error) setError(res.error)
  })
  const reject = () => startTransition(async () => { await actionRejectDraft(draft.id) })

  return (
    <div style={card}>
      <h3 style={{ color: '#f1f5f9', margin: 0 }}>{draft.title}</h3>
      <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0' }}>
        {draft.url} {draft.status === 'failed' && <span style={{ color: '#f87171' }}> · échec précédent : {draft.error}</span>}
      </p>

      <span style={label}>LinkedIn (modèle automatique : titre + extrait + lien)</span>
      <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>{draft.title}<br />{draft.excerpt}</div>

      <label style={label} htmlFor={`ig-${draft.id}`}>Légende Instagram ({ig.length}/2200)</label>
      <textarea id={`ig-${draft.id}`} style={area} value={ig} onChange={e => setIg(e.target.value)} />

      <label style={label} htmlFor={`yt-${draft.id}`}>Post communauté YouTube ({yt.length}/5000)</label>
      <textarea id={`yt-${draft.id}`} style={area} value={yt} onChange={e => setYt(e.target.value)} />

      {error && <p role="alert" style={{ color: '#f87171' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button disabled={isPending} onClick={approve}
          style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer' }}>
          {isPending ? '...' : '✓ Approuver et publier'}
        </button>
        <button disabled={isPending} onClick={reject}
          style={{ background: 'transparent', color: '#f87171', border: '1px solid #f87171', borderRadius: 6, padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Rejeter
        </button>
      </div>
    </div>
  )
}

export default function SocialClient({ open, history }: { open: SocialDraft[]; history: SocialDraft[] }) {
  return (
    <>
      <h2 style={{ color: '#f1f5f9', fontSize: '1.1rem' }}>À valider ({open.length})</h2>
      {open.length === 0 && <p style={{ color: '#64748b' }}>Aucun brouillon en attente.</p>}
      {open.map(d => <DraftCard key={d.id} draft={d} />)}

      {history.length > 0 && (
        <>
          <h2 style={{ color: '#f1f5f9', fontSize: '1.1rem', marginTop: '2rem' }}>Historique</h2>
          <ul style={{ color: '#94a3b8', paddingLeft: '1.2rem' }}>
            {history.map(d => (
              <li key={d.id}>{d.title} · {d.status === 'posted' ? 'publié' : 'rejeté'} · {d.decidedAt?.slice(0, 10)}</li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
