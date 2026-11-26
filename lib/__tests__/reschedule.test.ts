import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

const NOW = new Date('2026-11-26T10:00:00Z')
let tmp: string

// Données isolées : un dossier temporaire sert de racine, les vraies données ne sont jamais touchées.
beforeEach(() => {
  vi.resetModules()
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jambo-test-'))
  fs.mkdirSync(path.join(tmp, 'data'))
  vi.spyOn(process, 'cwd').mockReturnValue(tmp)
})
afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe('rescheduleEntry', () => {
  it('déplace une entrée en attente vers un créneau libre', async () => {
    const { addToSchedule, rescheduleEntry, getSchedule } = await import('../schedule')
    const e = addToSchedule('a', 'fs', '2026-11-30T08:00:00.000Z')
    expect(rescheduleEntry(e.id, '2026-12-02T08:00:00.000Z', NOW)).toEqual({ ok: true })
    expect(getSchedule()[0].scheduledAt).toBe('2026-12-02T08:00:00.000Z')
  })

  it('échange deux articles quand le créneau visé est occupé', async () => {
    const { addToSchedule, rescheduleEntry, getSchedule } = await import('../schedule')
    const a = addToSchedule('a', 'fs', '2026-11-30T08:00:00.000Z')
    addToSchedule('b', 'fs', '2026-12-02T08:00:00.000Z')
    const r = rescheduleEntry(a.id, '2026-12-02T08:00:00.000Z', NOW)
    expect(r).toEqual({ ok: true, swappedWith: 'b' })
    const bySlug = Object.fromEntries(getSchedule().map(e => [e.slug, e.scheduledAt]))
    expect(bySlug.a).toBe('2026-12-02T08:00:00.000Z')
    expect(bySlug.b).toBe('2026-11-30T08:00:00.000Z')
  })

  it('refuse une date passée, invalide, ou une entrée qui n’est plus en attente', async () => {
    const { addToSchedule, rescheduleEntry, markPublished } = await import('../schedule')
    const e = addToSchedule('a', 'fs', '2026-11-30T08:00:00.000Z')
    expect(rescheduleEntry(e.id, '2026-11-01T08:00:00.000Z', NOW).ok).toBe(false)
    expect(rescheduleEntry(e.id, 'nope', NOW).ok).toBe(false)
    expect(rescheduleEntry('inconnu', '2026-12-02T08:00:00.000Z', NOW).ok).toBe(false)
    markPublished(e.id)
    expect(rescheduleEntry(e.id, '2026-12-04T08:00:00.000Z', NOW).ok).toBe(false)
  })
})

describe('heure de Paris', () => {
  it('convertit un champ datetime-local en UTC (hiver et été) et inversement', async () => {
    const { parisLocalToUtc, utcToParisLocal } = await import('../schedule-slots')
    expect(parisLocalToUtc('2026-12-02T09:30')?.toISOString()).toBe('2026-12-02T08:30:00.000Z')
    expect(parisLocalToUtc('2026-07-01T09:00')?.toISOString()).toBe('2026-07-01T07:00:00.000Z')
    expect(utcToParisLocal('2026-12-02T08:30:00.000Z')).toBe('2026-12-02T09:30')
    expect(parisLocalToUtc('pas une date')).toBeNull()
    expect(parisLocalToUtc('2026-13-40T25:99')).toBeNull()
  })
})
