import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

const dataFile = path.join(process.cwd(), 'data', 'content-status.json')
const backup = path.join(process.cwd(), 'data', 'content-status.backup.json')

beforeEach(() => {
  vi.resetModules()
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backup)
  fs.writeFileSync(dataFile, '{}')
})

afterEach(() => {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, dataFile)
    fs.unlinkSync(backup)
  }
})

describe('getContentStatus', () => {
  it('retourne unreviewed pour un slug inconnu', async () => {
    const { getContentStatus } = await import('../content-status')
    const status = getContentStatus('slug-inconnu')
    expect(status.status).toBe('unreviewed')
  })

  it('retourne le statut sauvegardé', async () => {
    const { getContentStatus, setContentStatus } = await import('../content-status')
    setContentStatus('mon-post', { status: 'ready', reviewedAt: '2026-06-26T09:00:00Z' })
    expect(getContentStatus('mon-post').status).toBe('ready')
    expect(getContentStatus('mon-post').reviewedAt).toBe('2026-06-26T09:00:00Z')
  })
})

describe('setContentStatus', () => {
  it('fusionne les champs partiels sans écraser les autres', async () => {
    const { getContentStatus, setContentStatus } = await import('../content-status')
    setContentStatus('post-a', { status: 'ready', aiImprovedTitle: 'Titre amélioré' })
    setContentStatus('post-a', { status: 'scheduled' })
    expect(getContentStatus('post-a').aiImprovedTitle).toBe('Titre amélioré')
    expect(getContentStatus('post-a').status).toBe('scheduled')
  })
})

describe('getAllByStatus', () => {
  it('retourne uniquement les posts du statut demandé', async () => {
    const { setContentStatus, getAllByStatus } = await import('../content-status')
    setContentStatus('post-1', { status: 'ready' })
    setContentStatus('post-2', { status: 'scheduled' })
    setContentStatus('post-3', { status: 'ready' })
    const ready = getAllByStatus('ready')
    expect(ready).toHaveLength(2)
    expect(ready.map(r => r.slug)).toContain('post-1')
    expect(ready.map(r => r.slug)).toContain('post-3')
  })
})
