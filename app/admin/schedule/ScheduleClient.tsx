'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  actionAddToSchedule, actionRemoveFromSchedule, actionAutoSchedule, actionRescheduleEntry, actionSetEntryLocalTime, actionPlanTopic, actionScheduleAtLocal,
  type AutoScheduleResult,
} from '@/lib/actions/schedule'
import { utcToParisLocal } from '@/lib/schedule-slots'
import type { ScheduleEntry } from '@/lib/schedule'
import type { AdminPostRow } from '@/lib/posts'
import styles from '@/styles/AdminSchedule.module.css'

const TZ = 'Europe/Paris'
const dayName = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'short' }).format(new Date(iso)).replace('.', '')
const dayNum = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(iso))
const hourOf = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
const ymd = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
const fullLabel = (iso: string) => `${dayName(iso)} ${dayNum(iso)} · ${hourOf(iso)}`

/** Clé de semaine = date (Paris) du lundi correspondant. */
function weekKey(iso: string): string {
  const [y, m, d] = ymd(iso).split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function weekLabel(key: string): string {
  const monday = new Date(`${key}T12:00:00Z`)
  const friday = new Date(monday.getTime() + 4 * 86_400_000)
  const f = (d: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(d)
  return `Semaine du ${f(monday)} au ${f(friday)}`
}

export interface ScheduleNote { id: string; title: string; targetSlot?: string; status: string }

/**
 * Calendrier de publication, modifiable partout : glisser un article vers un autre créneau (ou le faire échanger sa place),
 * le déplacer avec la liste, fixer une date et une heure précises, noter un sujet à venir sur un créneau libre.
 */
export default function ScheduleClient({
  schedule, posts, readyPosts, slots, notes, courses,
}: {
  schedule: ScheduleEntry[]
  posts: { slug: string; title: string }[]
  readyPosts: AdminPostRow[]
  slots: string[]
  notes: ScheduleNote[]
  courses: { slug: string; title: string }[]
}) {
  const [isPending, startTransition] = useTransition()
  const [openSlot, setOpenSlot] = useState<string | null>(null)
  const [result, setResult] = useState<AutoScheduleResult | null>(null)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [topic, setTopic] = useState<Record<string, string>>({})
  const [preciseSlug, setPreciseSlug] = useState('')
  const [preciseWhen, setPreciseWhen] = useState('')

  const pending = schedule.filter(e => e.status === 'pending')
  const entryAt = (slot: string) => pending.find(e => e.scheduledAt.slice(0, 10) === slot.slice(0, 10))
  const notesAt = (slot: string) => notes.filter(n => n.targetSlot && n.targetSlot.slice(0, 10) === slot.slice(0, 10) && n.status !== 'ecrit')
  const titleOf = (slug: string) => posts.find(p => p.slug === slug)?.title ?? readyPosts.find(p => p.slug === slug)?.title ?? courses.find(c => c.slug === slug)?.title ?? slug
  const titleOfEntry = (e: ScheduleEntry) => (e.kind === 'course' ? courses.find(c => c.slug === e.slug)?.title ?? e.slug : titleOf(e.slug))
  const usedSlugs = new Set(pending.map(e => e.slug))
  const available = readyPosts.filter(p => !usedSlugs.has(p.slug))

  // Programmations placées hors des créneaux habituels (date précise) : sans cette liste, elles seraient invisibles
  const slotDays = new Set(slots.map(s => s.slice(0, 10)))
  const others = pending.filter(e => !slotDays.has(e.scheduledAt.slice(0, 10)))

  const weeks = new Map<string, string[]>()
  for (const s of slots) {
    const k = weekKey(s)
    weeks.set(k, [...(weeks.get(k) ?? []), s])
  }

  const say = (text: string, error = false) => setMessage({ text, error })
  const fill = (count: number) => startTransition(async () => setResult(await actionAutoSchedule(count)))

  const move = (entryId: string, iso: string) =>
    startTransition(async () => {
      const r = await actionRescheduleEntry(entryId, iso)
      say(r.ok ? (r.swappedWith ? `Échangé avec « ${titleOf(r.swappedWith)} ».` : 'Déplacé.') : r.error, !r.ok)
    })

  const setExact = (entryId: string, local: string) =>
    startTransition(async () => {
      const r = await actionSetEntryLocalTime(entryId, local)
      say(r.ok ? 'Date et heure modifiées.' : r.error, !r.ok)
    })

  const addPrecise = () => {
    const post = available.find(p => p.slug === preciseSlug)
    if (!post) return say('Choisissez un article prêt.', true)
    if (!preciseWhen) return say('Choisissez une date et une heure.', true)
    startTransition(async () => {
      const r = await actionScheduleAtLocal(post.slug, post.source as 'fs' | 'db', preciseWhen)
      if (r.ok) { setPreciseSlug(''); setPreciseWhen(''); say('Programmé.') } else say(r.error ?? 'Échec.', true)
    })
  }

  const planTopic = (slot: string) => {
    const text = (topic[slot] ?? '').trim()
    if (!text) return
    startTransition(async () => {
      const r = await actionPlanTopic(text, slot)
      if (r.ok) { setTopic(t => ({ ...t, [slot]: '' })); say('Sujet noté dans le carnet pour ce créneau.') } else say(r.error ?? 'Échec.', true)
    })
  }

  return (
    <div className={styles.agenda}>
      <div className={styles.bar}>
        <p className={styles.count}>
          {available.length === 0
            ? 'Aucun article prêt. Marquez un article « prêt » depuis la relecture.'
            : `${available.length} article${available.length > 1 ? 's' : ''} prêt${available.length > 1 ? 's' : ''} à placer`}
        </p>
        <div className={styles.barActions}>
          <button className={styles.btn} disabled={isPending || available.length === 0} onClick={() => fill(3)}>
            {isPending ? 'Placement…' : 'Remplir la semaine'}
          </button>
          <button className={`${styles.btn} ${styles.quiet}`} disabled={isPending || available.length === 0} onClick={() => fill(12)}>Remplir le mois</button>
        </div>
      </div>

      <details className={styles.precise}>
        <summary>Programmer à une date et une heure précises</summary>
        <p className={styles.hint} style={{ margin: '0.5rem 0 0' }}>La mise en ligne est faite par la tâche planifiée du site, qui tourne le lundi, le mercredi et le vendredi vers 9 h 15 (une publication à la fois). L’article sortira donc à la première de ces occasions après la date choisie.</p>
        <div className={styles.preciseRow}>
          <label>Article prêt
            <select value={preciseSlug} onChange={e => setPreciseSlug(e.target.value)} disabled={available.length === 0}>
              <option value="">Choisir…</option>
              {available.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
            </select>
          </label>
          <label>Date et heure (Paris)
            <input type="datetime-local" value={preciseWhen} onChange={e => setPreciseWhen(e.target.value)} />
          </label>
          <button className={styles.btn} disabled={isPending} onClick={addPrecise}>Programmer</button>
        </div>
      </details>

      <div role="status" aria-live="polite">
        {message && <p className={styles.note} data-error={message.error ? 'true' : undefined}>{message.text}</p>}
        {result && (
          <div className={styles.note}>
            {result.scheduled.length > 0 && <p>{result.scheduled.length} créneau{result.scheduled.length > 1 ? 'x' : ''} rempli{result.scheduled.length > 1 ? 's' : ''}.</p>}
            {result.message && <p>{result.message}</p>}
          </div>
        )}
      </div>

      <p className={styles.hint}>Astuce : glissez un article programmé sur un autre créneau pour le déplacer, ou sur un article pour échanger leurs places.</p>


      {others.length > 0 && (
        <section className={styles.week} aria-label="Autres dates programmées">
          <h2 className={styles.weekTitle}>Autres dates programmées</h2>
          <div className={styles.grid}>
            {others.map(entry => (
              <div key={entry.id} className={`${styles.cell} ${styles.taken}`}>
                <div className={styles.when}>
                  <span className={styles.day}>{dayName(entry.scheduledAt)} {dayNum(entry.scheduledAt)}</span>
                  <span className={styles.hour}>{hourOf(entry.scheduledAt)}</span>
                </div>
                <p className={styles.title}>{entry.kind === 'course' && <span className={styles.kindChip}>Cours</span>}{titleOfEntry(entry)}</p>
                <details className={styles.edit}>
                  <summary>Modifier</summary>
                  <label>Déplacer vers
                    <select defaultValue="" disabled={isPending} onChange={e => { if (e.target.value) move(entry.id, e.target.value) }}>
                      <option value="" disabled>Choisir un créneau</option>
                      {slots.map(s => <option key={s} value={s}>{fullLabel(s)}{entryAt(s) ? ' · occupé (échange)' : ''}</option>)}
                    </select>
                  </label>
                  <label>Date et heure précises (Paris)
                    <input
                      type="datetime-local"
                      defaultValue={utcToParisLocal(entry.scheduledAt)}
                      disabled={isPending}
                      onBlur={e => { if (e.target.value && e.target.value !== utcToParisLocal(entry.scheduledAt)) setExact(entry.id, e.target.value) }}
                    />
                  </label>
                  <div className={styles.editLinks}>
                    <span />
                    <button className={styles.danger} disabled={isPending}
                      onClick={() => startTransition(() => actionRemoveFromSchedule(entry.id, entry.slug))}>
                      Annuler la programmation
                    </button>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>
      )}

      {[...weeks.entries()].map(([key, weekSlots]) => (
        <section key={key} className={styles.week} aria-label={weekLabel(key)}>
          <h2 className={styles.weekTitle}>{weekLabel(key)}</h2>
          <div className={styles.grid}>
            {weekSlots.map(slot => {
              const entry = entryAt(slot)
              const ideas = notesAt(slot)
              const open = openSlot === slot
              return (
                <div
                  key={slot}
                  className={`${styles.cell} ${entry ? styles.taken : styles.free}`}
                  data-over={dragOver === slot ? 'true' : undefined}
                  draggable={!!entry && !isPending}
                  onDragStart={e => { if (entry) { e.dataTransfer.setData('text/plain', entry.id); e.dataTransfer.effectAllowed = 'move' } }}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOver !== slot) setDragOver(slot) }}
                  onDragLeave={() => setDragOver(d => (d === slot ? null : d))}
                  onDrop={e => {
                    e.preventDefault(); setDragOver(null)
                    const id = e.dataTransfer.getData('text/plain')
                    if (id && id !== entry?.id) move(id, slot)
                  }}
                >
                  <div className={styles.when}>
                    <span className={styles.day}>{dayName(slot)} {dayNum(slot)}</span>
                    <span className={styles.hour}>{entry ? hourOf(entry.scheduledAt) : hourOf(slot)}</span>
                  </div>

                  {entry ? (
                    <>
                      <p className={styles.title}>{entry.kind === 'course' && <span className={styles.kindChip}>Cours</span>}{titleOfEntry(entry)}</p>
                      <details className={styles.edit}>
                        <summary>Modifier</summary>
                        <label>Déplacer vers
                          <select defaultValue="" disabled={isPending} onChange={e => { if (e.target.value) move(entry.id, e.target.value) }}>
                            <option value="" disabled>Choisir un créneau</option>
                            {slots.filter(s => s !== slot).map(s => (
                              <option key={s} value={s}>{fullLabel(s)}{entryAt(s) ? ' · occupé (échange)' : ''}</option>
                            ))}
                          </select>
                        </label>
                        <label>Date et heure précises (Paris)
                          <input
                            type="datetime-local"
                            defaultValue={utcToParisLocal(entry.scheduledAt)}
                            disabled={isPending}
                            onBlur={e => { if (e.target.value && e.target.value !== utcToParisLocal(entry.scheduledAt)) setExact(entry.id, e.target.value) }}
                          />
                        </label>
                        <div className={styles.editLinks}>
                          <Link href={`/admin/review`} className={styles.link}>Voir la relecture</Link>
                          <button className={styles.danger} disabled={isPending}
                            onClick={() => startTransition(() => actionRemoveFromSchedule(entry.id, entry.slug))}>
                            Libérer le créneau
                          </button>
                        </div>
                      </details>
                    </>
                  ) : (
                    <>
                      {ideas.map(n => (
                        <Link key={n.id} href="/admin/notes" className={styles.idea}><i>idée</i>{n.title}</Link>
                      ))}
                      {open ? (
                        <div className={styles.pick}>
                          <label className="sr-only" htmlFor={`pick-${slot}`}>Article à publier</label>
                          <select id={`pick-${slot}`} defaultValue="" disabled={isPending}
                            onChange={e => {
                              const post = available.find(p => p.slug === e.target.value)
                              if (!post) return
                              setOpenSlot(null)
                              startTransition(() => actionAddToSchedule(post.slug, post.source as 'fs' | 'db', slot))
                            }}>
                            <option value="" disabled>Choisir un article</option>
                            {available.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
                          </select>
                          <button className={styles.link} onClick={() => setOpenSlot(null)}>Annuler</button>
                        </div>
                      ) : (
                        <button className={styles.add} disabled={isPending || available.length === 0} onClick={() => setOpenSlot(slot)}>
                          Réserver ce créneau
                        </button>
                      )}
                      <form className={styles.topicForm} onSubmit={e => { e.preventDefault(); planTopic(slot) }}>
                        <label className="sr-only" htmlFor={`topic-${slot}`}>Noter un sujet pour ce créneau</label>
                        <input
                          id={`topic-${slot}`}
                          value={topic[slot] ?? ''}
                          onChange={e => setTopic(t => ({ ...t, [slot]: e.target.value }))}
                          placeholder="Noter un sujet…"
                          maxLength={200}
                        />
                        <button type="submit" disabled={isPending || !(topic[slot] ?? '').trim()} aria-label="Ajouter au carnet">+</button>
                      </form>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
