// app/admin/schedule/ScheduleClient.tsx
'use client'
import { useState, useTransition } from 'react'
import { actionAddToSchedule, actionRemoveFromSchedule } from '@/lib/actions/schedule'
import type { ScheduleEntry } from '@/lib/schedule'
import type { AdminPostRow } from '@/lib/posts'

function getNextSlots(count = 6): string[] {
  const slots: string[] = []
  const d = new Date()
  while (slots.length < count) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day === 1 || day === 3 || day === 5) {
      const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 7))
      slots.push(iso.toISOString())
    }
  }
  return slots
}

export default function ScheduleClient({
  schedule,
  readyPosts,
}: {
  schedule: ScheduleEntry[]
  readyPosts: AdminPostRow[]
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedSlug, setSelectedSlug] = useState('')
  const slots = getNextSlots(6)

  const pendingSlots = schedule.filter(e => e.status === 'pending')

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Prochains créneaux
        </h2>
        {slots.map(slot => {
          const dateStr = slot.slice(0, 10)
          const scheduled = pendingSlots.find(e => e.scheduledAt.slice(0, 10) === dateStr)
          const label = new Date(slot).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

          return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.75rem', background: '#1e293b', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8', minWidth: '200px', fontSize: '0.9rem' }}>{label} 9h</span>
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
