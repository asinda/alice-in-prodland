import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'
import { useTempCwd } from './helpers'

let tmp: ReturnType<typeof useTempCwd>
beforeEach(() => { vi.resetModules(); tmp = useTempCwd() })
afterEach(() => { tmp.cleanup(); vi.unstubAllEnvs() })

const req = (token?: string) =>
  new NextRequest('http://localhost/api/backup', { headers: token ? { Authorization: `Bearer ${token}` } : {} })

describe('GET /api/backup', () => {
  it('est désactivé sans BACKUP_SECRET', async () => {
    vi.stubEnv('BACKUP_SECRET', '')
    const { GET } = await import('@/app/api/backup/route')
    expect(GET(req('x')).status).toBe(401)
  })

  it('refuse un mauvais token', async () => {
    vi.stubEnv('BACKUP_SECRET', 'secret-de-sauvegarde-long')
    const { GET } = await import('@/app/api/backup/route')
    expect(GET(req('mauvais')).status).toBe(401)
    expect(GET(req()).status).toBe(401)
  })

  it('exporte les JSON valides, signale les corrompus, ignore bundles et .bak', async () => {
    vi.stubEnv('BACKUP_SECRET', 'secret-de-sauvegarde-long')
    const d = path.join(tmp.dir, 'data')
    fs.writeFileSync(path.join(d, 'posts.json'), '[{"id":"1"}]')
    fs.writeFileSync(path.join(d, 'courses.json'), '{"tronq')
    fs.writeFileSync(path.join(d, 'x-bundle.json'), '{}')
    fs.writeFileSync(path.join(d, 'posts.json.bak'), '[]')
    fs.mkdirSync(path.join(d, 'translations-en'))
    fs.writeFileSync(path.join(d, 'translations-en', 'a.md'), '# EN')

    const { GET } = await import('@/app/api/backup/route')
    const res = GET(req('secret-de-sauvegarde-long'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body.files).sort()).toEqual(['courses.json', 'posts.json'])
    expect(body.files['posts.json']).toEqual([{ id: '1' }])
    expect(body.files['courses.json'].__error).toBeTruthy()
    expect(body.translations['a.md']).toBe('# EN')
  })
})
