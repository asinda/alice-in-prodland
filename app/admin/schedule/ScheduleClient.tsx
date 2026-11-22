// app/admin/schedule/ScheduleClient.tsx
'use client'
import { useState, useTransition } from 'react'
import { actionAddToSchedule, actionRemoveFromSchedule, actionAutoSchedule, type AutoScheduleResult } from '@/lib/actions/schedule'
import { formatSlot } from '@/lib/schedule-slots'
import type { ScheduleEntry } from '@/lib/schedule'
import type { AdminPostRow } from '@/lib/posts'

export default function ScheduleClient({
  schedule,
  readyPosts,
  slots,
}: {
  schedule: ScheduleEntry[]
  readyPosts: AdminPostRow[]
  slots: string[]
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedSlug, setSelectedSlug] = useState('')
  const [auto, setAuto] = useState<AutoScheduleResult | null>(null)

  const pendingSlots = schedule.filter(e => e.status === 'pending')

  const planAuto = (count: number) => startTransition(async () => {
    setAuto(await actionAutoSchedule(count))
  })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#1e293b', borderRadius: '8px' }}>
        <p style={{ color: '#f1f5f9', margin: '0 0 0.25rem', fontWeight: 'bold' }}>Planification automatique</p>
        <p style={{ color: '#94a3b8', margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
          Place les articles « prêts » (les plus anciens d&apos;abord) sur les prochains créneaux libres.
          {' '}{readyPosts.length} article(s) prêt(s).
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button disabled={isPending || readyPosts.length === 0} onClick={() => planAuto(3)}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            {isPending ? '...' : '✦ Planifier la semaine (3)'}
          </button>
          <button disabled={isPending || readyPosts.length === 0} onClick={() => planAuto(12)}
            style={{ background: 'transparent', color: '#a78bfa', border: '1px solid #7c3aed', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Planifier le mois (12)
          </button>
        </div>
        {auto && (
          <div role="status" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
            {auto.scheduled.map(s => (
              <div key={s.slug} style={{ color: '#4ade80' }}>✓ {s.slug} → {formatSlot(s.scheduledAt)}</div>
            ))}
            {auto.message && <div style={{ color: '#fbbf24' }}>{auto.message}</div>}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Prochains créneaux
        </h2>
        {slots.map(slot => {
          const dateStr = slot.slice(0, 10)
          const scheduled = pendingSlots.find(e => e.scheduledAt.slice(0, 10) === dateStr)
          const label = formatSlot(slot)

          return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.75rem', background: '#1e293b', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8', minWidth: '200px', fontSize: '0.9rem' }}>{label}</span>
              {scheduled ? (
                <>
                  <span style={{ color: '#f1f5f9', flex: 1 }}>{scheduled.slug}</span>
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => actionRemoveFromSchedule(scheduled.id, scheduled.slug))}
                    style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Retirer
                  </button>
                </>
              ) : (
                <>
                  <select
                    value={selectedSlug}
                    onChange={e => setSelectedSlug(e.target.value)}
                    style={{ flex: 1, background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '6px', padding: '0.3rem 0.5rem' }}
                  >
                    <option value="">— choisir un post —</option>
                    {readyPosts.map(p => (
                      <option key={p.slug} value={p.slug}>{p.title}</option>
                    ))}
                  </select>
                  <button
                    disabled={isPending || !selectedSlug}
                    onClick={() => {
                      if (!selectedSlug) return
                      const post = readyPosts.find(p => p.slug === selectedSlug)!
                      startTransition(() => actionAddToSchedule(selectedSlug, post.source as 'fs' | 'db', slot))
                      setSelectedSlug('')
                    }}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Planifier
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
