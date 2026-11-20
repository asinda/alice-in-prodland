import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { useTempCwd } from './helpers'

let tmp: ReturnType<typeof useTempCwd>
beforeEach(() => { vi.resetModules(); tmp = useTempCwd() })
afterEach(() => tmp.cleanup())

const postInput = (slug: string) => ({
  slug, title: slug, excerpt: 'e', content: 'c', tags: ['t'], type: 'post' as const,
  status: 'draft' as const, publishedAt: null,
})

describe('db posts', () => {
  it('crée, lit, met à jour, publie, dépublie et supprime', async () => {
    const db = await import('../db')
    const p = db.createPost(postInput('a'))
    expect(p.id).toBeTruthy()
    expect(db.getPostBySlug('a')?.id).toBe(p.id)
    expect(db.getPostById(p.id)?.slug).toBe('a')

    db.updatePost(p.id, { title: 'Nouveau' })
    expect(db.getPostById(p.id)?.title).toBe('Nouveau')

    const pub = db.publishPost(p.id)
    expect(pub.status).toBe('published')
    expect(pub.publishedAt).toBeTruthy()
    expect(db.getPosts({ status: 'published' })).toHaveLength(1)

    expect(db.unpublishPost(p.id).status).toBe('draft')
    db.deletePost(p.id)
    expect(db.getPostById(p.id)).toBeNull()
  })

  it('lève une erreur pour un id inconnu', async () => {
    const db = await import('../db')
    expect(() => db.updatePost('nope', { title: 'x' })).toThrow()
  })

  it('les ids sont uniques', async () => {
    const db = await import('../db')
    const ids = new Set(Array.from({ length: 50 }, (_, i) => db.createPost(postInput(`s${i}`)).id))
    expect(ids.size).toBe(50)
  })

  it('restaure depuis la sauvegarde si posts.json est corrompu', async () => {
    const db = await import('../db')
    db.createPost(postInput('a'))
    db.createPost(postInput('b'))
    fs.writeFileSync(path.join(tmp.dir, 'data', 'posts.json'), '{"tronq')
    expect(db.getPosts().length).toBeGreaterThanOrEqual(1)
  })
})

describe('db courses & lessons', () => {
  it('trie les leçons par order après chaque écriture', async () => {
    const db = await import('../db')
    const c = db.createCourse({
      slug: 'c', title: 'C', excerpt: '', description: '', tags: [], status: 'draft', publishedAt: null,
      gumroadUrl: '',
    } as never)
    db.addLesson(c.id, { slug: 'l2', title: 'L2', content: '', order: 2 })
    db.addLesson(c.id, { slug: 'l1', title: 'L1', content: '', order: 1 })
    expect(db.getCourseById(c.id)?.lessons.map(l => l.slug)).toEqual(['l1', 'l2'])

    const lesson = db.getCourseById(c.id)!.lessons[0]
    db.updateLesson(c.id, lesson.id, { order: 3 })
    expect(db.getCourseById(c.id)?.lessons.map(l => l.slug)).toEqual(['l2', 'l1'])

    db.deleteLesson(c.id, lesson.id)
    expect(db.getCourseById(c.id)?.lessons).toHaveLength(1)
  })
})
