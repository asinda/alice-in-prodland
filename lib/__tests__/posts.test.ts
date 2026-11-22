import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { useTempCwd } from './helpers'

let tmp: ReturnType<typeof useTempCwd>

beforeEach(() => {
  vi.resetModules()
  tmp = useTempCwd()
  const fr = path.join(tmp.dir, 'posts', 'fr')
  fs.mkdirSync(fr, { recursive: true })
  fs.writeFileSync(path.join(fr, 'fs-only.md'), '---\ntitle: FS Only\ndate: 2026-01-01\nexcerpt: ex\ntags: [a]\n---\n\n## Section A\n\ntexte\n\n### Sous B\n')
  fs.writeFileSync(path.join(fr, 'collision.md'), '---\ntitle: FS Collision\ndate: 2026-01-02\nexcerpt: ex\n---\n\ncorps fs\n')
})
afterEach(() => tmp.cleanup())

describe('posts : fusion FS + DB', () => {
  it('le post DB gagne en cas de collision de slug et seuls les DB publiés sont listés', async () => {
    const db = await import('../db')
    const p = db.createPost({ slug: 'collision', title: 'DB Collision', excerpt: 'e', content: 'corps db', tags: [], type: 'post', status: 'published', publishedAt: '2026-02-01T00:00:00Z' })
    db.createPost({ slug: 'brouillon', title: 'Brouillon', excerpt: 'e', content: 'x', tags: [], type: 'post', status: 'draft', publishedAt: null })
    const { getAllPosts, getPost } = await import('../posts')

    const all = getAllPosts()
    expect(all.map(x => x.slug).sort()).toEqual(['collision', 'fs-only'])
    expect(all.find(x => x.slug === 'collision')?.title).toBe('DB Collision')
    expect((await getPost('collision')).contentHtml).toContain('corps db')
    expect(p.id).toBeTruthy()
  })

  it('génère le sommaire h2/h3 avec des ids', async () => {
    const { getPost } = await import('../posts')
    const post = await getPost('fs-only')
    expect(post.toc.map(t => [t.level, t.text])).toEqual([[2, 'Section A'], [3, 'Sous B']])
    expect(post.toc[0].id).toBe('section-a')
  })

  it('slug inconnu ou dangereux => PostNotFoundError, pas de lecture hors dossier', async () => {
    const { getPost, getFsPostRaw, PostNotFoundError } = await import('../posts')
    await expect(getPost('inconnu')).rejects.toBeInstanceOf(PostNotFoundError)
    await expect(getPost('../../data/posts')).rejects.toBeInstanceOf(PostNotFoundError)
    expect(getFsPostRaw('../fr/fs-only')).toBeNull()
    expect(getFsPostRaw('fs-only')?.title).toBe('FS Only')
  })
})

describe('traductions : priorité au volume', () => {
  it('une traduction écrite à l\'exécution est lue en priorité et listée', async () => {
    const tr = await import('../translations')
    expect(tr.getTranslation('fs-only')).toBeNull()
    tr.setTranslation('fs-only', { titleEn: 'EN title', excerptEn: 'EN ex', contentEn: 'EN body' })
    const t = tr.getTranslation('fs-only')
    expect(t?.titleEn).toBe('EN title')
    expect(t?.contentEn).toBe('EN body')
    expect(fs.existsSync(path.join(tmp.dir, 'data', 'translations-en', 'fs-only.md'))).toBe(true)
    expect(tr.getAllTranslations()['fs-only']).toBeTruthy()
  })

  it('refuse un slug invalide', async () => {
    const tr = await import('../translations')
    expect(() => tr.getTranslation('../x')).toThrow()
    expect(() => tr.setTranslation('a/b', { titleEn: '', excerptEn: '', contentEn: '' })).toThrow()
  })
})
