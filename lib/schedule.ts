import path from 'path'
import { readJsonFile, writeJsonFile } from './jsonStore'

const dataFile = path.join(process.cwd(), 'data', 'schedule.json')

export interface ScheduleEntry {
  id: string
  slug: string
  source: 'fs' | 'db'
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

export function addToSchedule(slug: string, source: 'fs' | 'db', scheduledAt: string): ScheduleEntry {
  const entries = readAll()
  const entry: ScheduleEntry = { id: cuid(), slug, source, scheduledAt, status: 'pending' }
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
