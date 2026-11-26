import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

let tmp: string
let vault: string

// Données et vault isolés : dossiers temporaires, jamais les vrais cours ni le vrai vault.
beforeEach(() => {
  vi.resetModules()
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jambo-import-'))
  fs.mkdirSync(path.join(tmp, 'data'))
  vault = path.join(tmp, 'vault')
  fs.mkdirSync(path.join(vault, 'Docker avance'), { recursive: true })
  fs.writeFileSync(path.join(vault, 'Docker avance', '10 - Production.md'), '# Production\n\nSwarm et monitoring.\n')
  fs.writeFileSync(path.join(vault, 'Docker avance', '02 - Images.md'), '# Images\n\nCouches et cache. ![[schema.png]]\n')
  fs.writeFileSync(path.join(vault, 'Docker avance', '01 - Architecture.md'), '# Architecture\n\nLe démon et les conteneurs.\n')
  fs.writeFileSync(path.join(vault, 'Docker avance', 'vide.md'), '   \n')
  fs.writeFileSync(path.join(vault, 'Docker avance', 'image.png'), 'pas du texte')
  process.env.OBSIDIAN_VAULT_PATH = vault
  vi.spyOn(process, 'cwd').mockReturnValue(tmp)
})
afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.OBSIDIAN_VAULT_PATH
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe('import d’un dossier du vault en cours', () => {
  it('crée un cours en brouillon : une leçon par note .md, dans l’ordre naturel, notes vides signalées', async () => {
    const { importFolderAsCourse } = await import('../obsidian-import')
    const r = importFolderAsCourse('Docker avance')!
    expect(r.course.status).toBe('draft')
    expect(r.course.title).toBe('Docker avance')
    expect(r.imported).toBe(3)
    expect(r.skipped).toEqual(['vide.md'])
    expect(r.course.lessons.map(l => l.title)).toEqual(['Architecture', 'Images', 'Production'])
    expect(r.course.lessons.map(l => l.order)).toEqual([0, 1, 2])
  })

  it('nettoie la syntaxe propre à Obsidian dans les leçons', async () => {
    const { importFolderAsCourse } = await import('../obsidian-import')
    const r = importFolderAsCourse('Docker avance', 'Mon cours')!
    expect(r.course.title).toBe('Mon cours')
    expect(r.course.lessons[1].content).not.toContain('![[')
  })

  it('renvoie null pour un dossier sans note .md', async () => {
    fs.mkdirSync(path.join(vault, 'Vide'))
    const { importFolderAsCourse } = await import('../obsidian-import')
    expect(importFolderAsCourse('Vide')).toBeNull()
  })

  it('ne sort jamais du vault', async () => {
    const { importFolderAsCourse } = await import('../obsidian-import')
    expect(importFolderAsCourse('../..')).toBeNull()
  })
})

describe('import d’une note comme leçon ou article', () => {
  it('ajoute une leçon à la fin d’un cours existant, avec un slug unique', async () => {
    const { importFolderAsCourse, importTextAsLesson } = await import('../obsidian-import')
    const { course } = importFolderAsCourse('Docker avance')!
    const a = importTextAsLesson({ title: 'Bonus', content: 'Contenu 1' }, course.id)!
    const b = importTextAsLesson({ title: 'Bonus', content: 'Contenu 2' }, course.id)!
    expect(a.order).toBe(3)
    expect(b.order).toBe(4)
    expect(b.slug).toBe('bonus-2')
    expect(importTextAsLesson({ title: 'x', content: '   ' }, course.id)).toBeNull()
    expect(importTextAsLesson({ title: 'x', content: 'ok' }, 'inconnu')).toBeNull()
  })

  it('crée un article en brouillon depuis un texte collé', async () => {
    const { importTextAsPost } = await import('../obsidian-import')
    const post = importTextAsPost({ title: 'Ma note', content: 'Texte de la note' })!
    expect(post.status).toBe('draft')
    expect(post.slug).toBe('ma-note')
    expect(importTextAsPost({ title: 'Vide', content: '' })).toBeNull()
  })
})
