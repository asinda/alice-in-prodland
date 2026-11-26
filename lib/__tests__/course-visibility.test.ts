import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

let tmp: string

// Données isolées : un dossier temporaire sert de racine, les vrais cours ne sont jamais touchés.
beforeEach(() => {
  vi.resetModules()
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jambo-course-'))
  fs.mkdirSync(path.join(tmp, 'data'))
  vi.spyOn(process, 'cwd').mockReturnValue(tmp)
})
afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(tmp, { recursive: true, force: true })
})

const newCourse = (createCourse: typeof import('../db').createCourse, status: 'draft' | 'published' = 'published') =>
  createCourse({ slug: 'mon-cours', title: 'Mon cours', description: 'Desc', tags: [], status, publishedAt: status === 'published' ? '2026-01-01' : null, gumroadUrl: '' })

describe('masquer un cours sans le supprimer', () => {
  it('un cours masqué quitte la liste publique mais reste en base avec ses leçons, et peut être republié', async () => {
    const { createCourse, addLesson, getCourses, getCourseById, publishCourse, unpublishCourse } = await import('../db')
    const c = newCourse(createCourse)
    addLesson(c.id, { slug: 'l1', title: 'Leçon 1', content: 'x', order: 0 })
    expect(getCourses({ status: 'published' }).map(x => x.slug)).toContain('mon-cours')

    const hidden = unpublishCourse(c.id)
    expect(hidden.status).toBe('draft')
    expect(hidden.publishedAt).toBeNull()
    expect(getCourses({ status: 'published' })).toHaveLength(0)
    expect(getCourseById(c.id)?.lessons).toHaveLength(1)

    publishCourse(c.id)
    expect(getCourses({ status: 'published' }).map(x => x.slug)).toContain('mon-cours')
  })
})

describe('programmer la mise en ligne d’un cours', () => {
  it('l’entrée garde son type « cours » ; un article reste sans type', async () => {
    const { addToSchedule, getSchedule } = await import('../schedule')
    addToSchedule('mon-cours', 'db', '2026-12-02T08:00:00.000Z', 'course')
    addToSchedule('mon-article', 'db', '2026-12-04T08:00:00.000Z')
    const [c, a] = getSchedule()
    expect(c.kind).toBe('course')
    expect(a.kind).toBeUndefined()
  })

  it('déplacer ou échanger fonctionne aussi pour un cours', async () => {
    const { addToSchedule, rescheduleEntry, getSchedule } = await import('../schedule')
    const c = addToSchedule('mon-cours', 'db', '2026-11-30T08:00:00.000Z', 'course')
    addToSchedule('mon-article', 'db', '2026-12-02T08:00:00.000Z')
    expect(rescheduleEntry(c.id, '2026-12-02T08:00:00.000Z', new Date('2026-11-26T10:00:00Z'))).toEqual({ ok: true, swappedWith: 'mon-article' })
    const course = getSchedule().find(e => e.slug === 'mon-cours')!
    expect(course.scheduledAt).toBe('2026-12-02T08:00:00.000Z')
    expect(course.kind).toBe('course')
  })
})
