import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

const dataFile = path.join(process.cwd(), 'data', 'schedule.json')
const backup = path.join(process.cwd(), 'data', 'schedule.backup.json')

beforeEach(() => {
  vi.resetModules()
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backup)
  fs.writeFileSync(dataFile, '[]')
})

afterEach(() => {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, dataFile)
    fs.unlinkSync(backup)
  }
})

describe('addToSchedule', () => {
  it('ajoute une entrée pending avec un id', async () => {
    const { addToSchedule, getSchedule } = await import('../schedule')
    const entry = addToSchedule('mon-post', 'fs', '2026-06-30T09:00:00Z')
    expect(entry.id).toBeTruthy()
    expect(entry.status).toBe('pending')
    expect(getSchedule()).toHaveLength(1)
  })
})

describe('getNextPending', () => {
  it('retourne le premier pending dont scheduledAt est dépassé', async () => {
    const { addToSchedule, getNextPending } = await import('../schedule')
    addToSchedule('post-passe', 'db', '2026-01-01T09:00:00Z')
    addToSchedule('post-futur', 'db', '2099-01-01T09:00:00Z')
    const next = getNextPending(new Date('2026-06-26T10:00:00Z'))
    expect(next?.slug).toBe('post-passe')
  })

  it('retourne null si aucun pending échu', async () => {
    const { addToSchedule, getNextPending } = await import('../schedule')
    addToSchedule('post-futur', 'db', '2099-01-01T09:00:00Z')
    expect(getNextPending(new Date())).toBeNull()
  })

  it('ignore les entrées published', async () => {
    const { addToSchedule, markPublished, getNextPending } = await import('../schedule')
    const entry = addToSchedule('post-pub', 'db', '2026-01-01T09:00:00Z')
    markPublished(entry.id)
    expect(getNextPending(new Date())).toBeNull()
  })
})

describe('markFailed', () => {
  it('stocke le message d\'erreur', async () => {
    const { addToSchedule, markFailed, getSchedule } = await import('../schedule')
    const entry = addToSchedule('post-err', 'db', '2026-01-01T09:00:00Z')
    markFailed(entry.id, 'Timeout')
    const updated = getSchedule().find(e => e.id === entry.id)
    expect(updated?.status).toBe('failed')
    expect(updated?.error).toBe('Timeout')
  })
})

describe('removeFromSchedule', () => {
  it('supprime l\'entrée par id', async () => {
    const { addToSchedule, removeFromSchedule, getSchedule } = await import('../schedule')
    const entry = addToSchedule('post-del', 'db', '2026-06-30T09:00:00Z')
    removeFromSchedule(entry.id)
    expect(getSchedule()).toHaveLength(0)
  })
})
