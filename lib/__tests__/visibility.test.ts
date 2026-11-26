import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

let tmp: string

// Racine temporaire : un article « .md » et une base vide, sans toucher aux vraies données.
beforeEach(() => {
  vi.resetModules()
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jambo-vis-'))
  fs.mkdirSync(path.join(tmp, 'data'))
  fs.mkdirSync(path.join(tmp, 'posts', 'fr'), { recursive: true })
  fs.writeFileSync(
    path.join(tmp, 'posts', 'fr', 'mon-article.md'),
    '---\ntitle: "Mon article"\ndate: "2026-01-10"\nexcerpt: "Résumé"\ntags: ["sre"]\nlevel: "avance"\n---\n\nContenu de l’article.\n',
  )
  vi.spyOn(process, 'cwd').mockReturnValue(tmp)
})
afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(tmp, { recursive: true, force: true })
})

describe('masquer un article sans le supprimer', () => {
  it('un article « .md » est visible, puis disparaît du site une fois masqué, tout en restant dans l’administration', async () => {
    const { getAllPosts, getPost, getAllAdminPosts } = await import('../posts')
    const { hidePostBySlug } = await import('../visibility')

    expect(getAllPosts().map(p => p.slug)).toContain('mon-article')
    expect((await getPost('mon-article')).title).toBe('Mon article')

    const hidden = hidePostBySlug('mon-article')!
    expect(hidden.status).toBe('draft')
    expect(hidden.level).toBe('avance')
    expect(hidden.content).toContain('Contenu de l’article.')

    expect(getAllPosts().map(p => p.slug)).not.toContain('mon-article')
    await expect(getPost('mon-article')).rejects.toThrow()
    expect(getAllAdminPosts().find(p => p.slug === 'mon-article')?.status).toBe('draft')
    // Le fichier d'origine n'est pas touché
    expect(fs.existsSync(path.join(tmp, 'posts', 'fr', 'mon-article.md'))).toBe(true)
  })

  it('republier un article masqué le remet sur le site, avec sa date de publication', async () => {
    const { getAllPosts, getPost } = await import('../posts')
    const { hidePostBySlug } = await import('../visibility')
    const { publishPost } = await import('../db')

    const hidden = hidePostBySlug('mon-article')!
    publishPost(hidden.id)
    expect(getAllPosts().filter(p => p.slug === 'mon-article')).toHaveLength(1)
    expect((await getPost('mon-article')).title).toBe('Mon article')
  })

  it('masquer un article déjà en base le repasse en brouillon, sans en créer un second', async () => {
    const { getAllPosts } = await import('../posts')
    const { createPost, getPosts } = await import('../db')
    const { hidePostBySlug } = await import('../visibility')

    createPost({ slug: 'depuis-admin', title: 'Depuis l’admin', excerpt: '', content: 'x', tags: [], type: 'post', status: 'published', publishedAt: '2026-02-01' })
    expect(getAllPosts().map(p => p.slug)).toContain('depuis-admin')
    hidePostBySlug('depuis-admin')
    hidePostBySlug('depuis-admin')
    expect(getAllPosts().map(p => p.slug)).not.toContain('depuis-admin')
    expect(getPosts().filter(p => p.slug === 'depuis-admin')).toHaveLength(1)
  })

  it('renvoie null pour un article inconnu ou un nom dangereux', async () => {
    const { hidePostBySlug } = await import('../visibility')
    expect(hidePostBySlug('inexistant')).toBeNull()
    expect(hidePostBySlug('../../etc/passwd')).toBeNull()
  })
})
