import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { nextPublicationSlots, parisToUtc, formatSlot } from '../schedule-slots'
import { useTempCwd } from './helpers'

describe('créneaux lundi/mercredi/vendredi 9h Paris', () => {
  it('9h Paris = 07:00 UTC en été et 08:00 UTC en hiver', () => {
    expect(parisToUtc(2026, 7, 15, 9).toISOString()).toBe('2026-07-15T07:00:00.000Z')
    expect(parisToUtc(2026, 1, 15, 9).toISOString()).toBe('2026-01-15T08:00:00.000Z')
  })

  it('ne propose que lundi, mercredi, vendredi, dans l\'ordre, strictement dans le futur', () => {
    // Jeudi 2026-11-19 12:00 UTC
    const slots = nextPublicationSlots(6, new Date('2026-11-19T12:00:00Z'))
    expect(slots.map(s => s.toISOString())).toEqual([
      '2026-11-20T08:00:00.000Z', // vendredi
      '2026-11-23T08:00:00.000Z', // lundi
      '2026-11-25T08:00:00.000Z', // mercredi
      '2026-11-27T08:00:00.000Z', // vendredi
      '2026-11-30T08:00:00.000Z', // lundi
      '2026-12-02T08:00:00.000Z', // mercredi
    ])
  })

  it('saute le créneau du jour s\'il est déjà passé', () => {
    // Lundi 2026-11-23 à 09:30 Paris (08:30 UTC) : le créneau de 9h est passé
    const slots = nextPublicationSlots(1, new Date('2026-11-23T08:30:00Z'))
    expect(slots[0].toISOString()).toBe('2026-11-25T08:00:00.000Z')
  })

  it('gère le passage à l\'heure d\'été (30 mars 2026)', () => {
    const slots = nextPublicationSlots(3, new Date('2026-03-27T10:00:00Z'))
    // vendredi 27 mars passé ; lundi 30 mars = heure d'été (UTC+2) => 07:00 UTC
    expect(slots[0].toISOString()).toBe('2026-03-30T07:00:00.000Z')
  })

  it('3 créneaux = une semaine', () => {
    const slots = nextPublicationSlots(3, new Date('2026-11-22T10:00:00Z')) // dimanche
    expect(slots.map(s => s.toISOString().slice(0, 10))).toEqual(['2026-11-23', '2026-11-25', '2026-11-27'])
  })

  it('formate en heure de Paris', () => {
    expect(formatSlot('2026-11-23T08:00:00.000Z')).toMatch(/lundi.*23.*novembre.*09:00/)
  })
})

vi.mock('../require-admin', () => ({ requireAdmin: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('actionAutoSchedule', () => {
  let tmp: ReturnType<typeof useTempCwd>
  beforeEach(() => {
    vi.resetModules()
    tmp = useTempCwd()
    const fr = path.join(tmp.dir, 'posts', 'fr')
    fs.mkdirSync(fr, { recursive: true })
    for (const [slug, date] of [['ancien', '2025-01-01'], ['milieu', '2025-06-01'], ['recent', '2026-01-01'], ['quatrieme', '2026-02-01']]) {
      fs.writeFileSync(path.join(fr, `${slug}.md`), `---\ntitle: ${slug}\ndate: ${date}\nexcerpt: e\n---\n\ncorps\n`)
    }
  })
  afterEach(() => tmp.cleanup())

  async function markAllReady() {
    const { setContentStatus } = await import('../content-status')
    for (const s of ['ancien', 'milieu', 'recent', 'quatrieme']) setContentStatus(s, { status: 'ready' })
  }

  it('planifie 3 articles prêts, les plus anciens d\'abord, sur 3 créneaux distincts', async () => {
    await markAllReady()
    const { actionAutoSchedule } = await import('../actions/schedule')
    const r = await actionAutoSchedule(3)
    expect(r.scheduled.map(s => s.slug)).toEqual(['ancien', 'milieu', 'recent'])
    expect(new Set(r.scheduled.map(s => s.scheduledAt)).size).toBe(3)
    expect(r.message).toMatch(/1 article/)
    const { getContentStatus } = await import('../content-status')
    expect(getContentStatus('ancien').status).toBe('scheduled')
    expect(getContentStatus('quatrieme').status).toBe('ready')
  })

  it('ne réutilise pas un créneau déjà pris', async () => {
    await markAllReady()
    const { actionAutoSchedule } = await import('../actions/schedule')
    const first = await actionAutoSchedule(1)
    const second = await actionAutoSchedule(1)
    expect(second.scheduled[0].scheduledAt).not.toBe(first.scheduled[0].scheduledAt)
    expect(second.scheduled[0].scheduledAt > first.scheduled[0].scheduledAt).toBe(true)
  })

  it('explique quand aucun article n\'est prêt', async () => {
    const { actionAutoSchedule } = await import('../actions/schedule')
    const r = await actionAutoSchedule(3)
    expect(r.scheduled).toEqual([])
    expect(r.message).toMatch(/Aucun article/)
  })
})

describe('anti double publication', () => {
  let tmp: ReturnType<typeof useTempCwd>
  beforeEach(() => { vi.resetModules(); tmp = useTempCwd() })
  afterEach(() => tmp.cleanup())

  it('hasPublishedSince détecte une publication récente', async () => {
    const s = await import('../schedule')
    const e = s.addToSchedule('x', 'fs', '2026-01-01T08:00:00Z')
    s.markPublished(e.id)
    expect(s.hasPublishedSince(6 * 3600_000)).toBe(true)
    expect(s.hasPublishedSince(6 * 3600_000, new Date(Date.now() + 7 * 3600_000))).toBe(false)
  })
})
