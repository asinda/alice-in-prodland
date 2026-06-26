import fs from 'fs'
import path from 'path'

const dataFile = path.join(process.cwd(), 'data', 'schedule.json')

export interface ScheduleEntry {
  id: string
  slug: string
  source: 'fs' | 'db'
  scheduledAt: string
  status: 'pending' | 'published' | 'failed'
  publishedAt?: string
  error?: string
}

function cuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function readAll(): ScheduleEntry[] {
  if (!fs.existsSync(dataFile)) return []
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  } catch {
    return []
  }
}

function writeAll(data: ScheduleEntry[]): void {
  const tmp = dataFile + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, dataFile)
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
