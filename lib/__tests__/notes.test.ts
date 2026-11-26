import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

let tmp: string

// Données isolées : un dossier temporaire sert de racine, les vraies notes et articles ne sont jamais touchés.
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

describe('carnet d’idées', () => {
  it('ajoute une idée avec le statut « idée » et refuse un titre vide', async () => {
    const { addNote, getNotes } = await import('../notes')
    const n = addNote({ title: '  Les erreurs de PodDisruptionBudget  ', tags: ['kubernetes'] })
    expect(n.title).toBe('Les erreurs de PodDisruptionBudget')
    expect(n.status).toBe('idee')
    expect(getNotes()).toHaveLength(1)
    expect(() => addNote({ title: '   ' })).toThrow()
  })

  it('met à jour, étoile et trie : étoilées d’abord, puis par avancement', async () => {
    const { addNote, updateNote, getNotes } = await import('../notes')
    const a = addNote({ title: 'A' })
    const b = addNote({ title: 'B' })
    const c = addNote({ title: 'C' })
    updateNote(b.id, { status: 'a_ecrire' })
    updateNote(c.id, { starred: true, status: 'ecrit' })
    expect(getNotes().map(n => n.title)).toEqual(['C', 'A', 'B'])
    expect(updateNote(a.id, { status: 'nimporte' as never })?.status).toBe('idee')
  })

  it('refuse de vider le titre, ignore un créneau invalide, retire un créneau avec une chaîne vide', async () => {
    const { addNote, updateNote } = await import('../notes')
    const n = addNote({ title: 'Sujet' })
    expect(() => updateNote(n.id, { title: ' ' })).toThrow()
    expect(updateNote(n.id, { targetSlot: 'pas une date' })?.targetSlot).toBeUndefined()
    expect(updateNote(n.id, { targetSlot: '2026-12-07T08:00:00Z' })?.targetSlot).toBe('2026-12-07T08:00:00.000Z')
    expect(updateNote(n.id, { targetSlot: '' })?.targetSlot).toBeUndefined()
  })

  it('crée un brouillon depuis la note, une seule fois', async () => {
    const { addNote, noteToDraft, getNote } = await import('../notes')
    const { getPostById, deletePost } = await import('../db')
    const n = addNote({ title: 'Sujet test carnet', body: 'plan : 1, 2, 3', tags: ['sre'] })
    const post = noteToDraft(n.id)!
    try {
      expect(post.status).toBe('draft')
      expect(post.content).toContain('# Sujet test carnet')
      expect(post.content).toContain('plan : 1, 2, 3')
      expect(getNote(n.id)?.status).toBe('en_cours')
      expect(getNote(n.id)?.postId).toBe(post.id)
      expect(noteToDraft(n.id)?.id).toBe(post.id)
    } finally {
      deletePost(post.id)
      expect(getPostById(post.id)).toBeNull()
    }
  })

  it('construit le plan éditorial : programmé, idée visée ou créneau libre', async () => {
    const { addNote, updateNote, buildPlan } = await import('../notes')
    const n = addNote({ title: 'Idée pour mercredi' })
    const withSlot = updateNote(n.id, { targetSlot: '2026-12-02T08:00:00Z' })!
    const plan = buildPlan(
      ['2026-11-30T08:00:00Z', '2026-12-02T08:00:00Z', '2026-12-04T08:00:00Z'],
      [{ scheduledAt: '2026-11-30T08:00:00Z', title: 'Article programmé' }],
      [withSlot],
    )
    expect(plan[0].scheduledTitle).toBe('Article programmé')
    expect(plan[1].note?.title).toBe('Idée pour mercredi')
    expect(plan[2].scheduledTitle).toBeUndefined()
    expect(plan[2].note).toBeUndefined()
  })
})
