import path from 'path'
import { readJsonFile, writeJsonFile } from './jsonStore'

const dataFile = path.join(process.cwd(), 'data', 'schedule.json')

export interface ScheduleEntry {
  id: string
  slug: string
  source: 'fs' | 'db'
  /** Absent = article. « course » : la mise en ligne publie un cours. */
  kind?: 'post' | 'course'
  scheduledAt: string
  status: 'pending' | 'processing' | 'published' | 'failed'
  claimedAt?: string
  publishedAt?: string
  error?: string
}

function cuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function readAll(): ScheduleEntry[] {
  return readJsonFile<ScheduleEntry[]>(dataFile, [])
}

function writeAll(data: ScheduleEntry[]): void {
  writeJsonFile(dataFile, data)
}

export function getSchedule(): ScheduleEntry[] {
  return readAll()
}

export function addToSchedule(slug: string, source: 'fs' | 'db', scheduledAt: string, kind: 'post' | 'course' = 'post'): ScheduleEntry {
  const entries = readAll()
  const entry: ScheduleEntry = { id: cuid(), slug, source, scheduledAt, status: 'pending', ...(kind === 'course' ? { kind } : {}) }
  entries.push(entry)
  writeAll(entries)
  return entry
}

export function removeFromSchedule(id: string): void {
  writeAll(readAll().filter(e => e.id !== id))
}

export function getNextPending(now: Date = new Date()): ScheduleEntry | null {
  const entries = readAll()
    .filter(e => e.status === 'pending' && new Date(e.scheduledAt) <= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  return entries[0] ?? null
}

/** Une entrée `processing` plus ancienne que ce délai est considérée abandonnée (crash). */
export const CLAIM_TIMEOUT_MS = 10 * 60 * 1000

/**
 * Réserve atomiquement la prochaine entrée à traiter (pending, ou processing expiré)
 * en la passant à `processing`. Deux déclenchements concurrents ne prennent pas la même.
 */
export function claimNextPending(now: Date = new Date()): ScheduleEntry | null {
  const entries = readAll()
  const due = entries
    .filter(e => {
      if (new Date(e.scheduledAt) > now) return false
      if (e.status === 'pending') return true
      return e.status === 'processing' && !!e.claimedAt && now.getTime() - new Date(e.claimedAt).getTime() > CLAIM_TIMEOUT_MS
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const entry = due[0]
  if (!entry) return null
  const idx = entries.findIndex(e => e.id === entry.id)
  entries[idx] = { ...entry, status: 'processing', claimedAt: now.toISOString() }
  writeAll(entries)
  return entries[idx]
}

/** Vrai si une entrée a été publiée depuis `ms` millisecondes (anti double publication entre deux déclenchements du cron). */
export function hasPublishedSince(ms: number, now: Date = new Date()): boolean {
  return readAll().some(e => e.status === 'published' && !!e.publishedAt && now.getTime() - new Date(e.publishedAt).getTime() < ms)
}

/** Vrai si un créneau (instant UTC) est déjà pris par une entrée en attente ou en cours. */
export function isSlotTaken(slotIso: string): boolean {
  const day = slotIso.slice(0, 10)
  return readAll().some(e => (e.status === 'pending' || e.status === 'processing') && e.scheduledAt.slice(0, 10) === day)
}

export function markPublished(id: string): void {
  const entries = readAll()
  const idx = entries.findIndex(e => e.id === id)
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], status: 'published', publishedAt: new Date().toISOString() }
    writeAll(entries)
  }
}

export function markFailed(id: string, error: string): void {
  const entries = readAll()
  const idx = entries.findIndex(e => e.id === id)
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], status: 'failed', error }
    writeAll(entries)
  }
}

export type RescheduleResult =
  | { ok: true; swappedWith?: string }
  | { ok: false; error: string }

/**
 * Déplace une entrée en attente vers un autre instant. Si un autre article en attente occupe déjà ce jour, les deux
 * échangent leur place (glisser-déposer). Les entrées en cours, publiées ou en échec ne bougent pas. Une date passée est refusée.
 */
export function rescheduleEntry(id: string, scheduledAt: string, now: Date = new Date()): RescheduleResult {
  const target = new Date(scheduledAt)
  if (Number.isNaN(target.getTime())) return { ok: false, error: 'Date invalide.' }
  if (target.getTime() <= now.getTime()) return { ok: false, error: 'Choisissez un moment à venir.' }
  const entries = readAll()
  const i = entries.findIndex(e => e.id === id)
  if (i === -1) return { ok: false, error: 'Entrée introuvable.' }
  if (entries[i].status !== 'pending') return { ok: false, error: 'Cet article n’est plus en attente : il ne peut pas être déplacé.' }

  const iso = target.toISOString()
  const day = iso.slice(0, 10)
  const j = entries.findIndex(e => e.id !== id && e.status === 'pending' && e.scheduledAt.slice(0, 10) === day)
  if (j !== -1) {
    const other = entries[j]
    entries[j] = { ...other, scheduledAt: entries[i].scheduledAt }
    entries[i] = { ...entries[i], scheduledAt: iso }
    writeAll(entries)
    return { ok: true, swappedWith: other.slug }
  }
  entries[i] = { ...entries[i], scheduledAt: iso }
  writeAll(entries)
  return { ok: true }
}
