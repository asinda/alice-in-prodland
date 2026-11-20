import { describe, it, expect, vi, afterEach } from 'vitest'
import { isAllowedGumroadUrl, linkGumroad } from '../integrations/gumroad'
import { previewCookieValue, safeEqual } from '../preview'

afterEach(() => vi.unstubAllGlobals())

describe('Gumroad anti-SSRF', () => {
  it('accepte gumroad.com et ses sous-domaines en https', () => {
    expect(isAllowedGumroadUrl('https://gumroad.com/l/abc')).toBe(true)
    expect(isAllowedGumroadUrl('https://alice.gumroad.com/l/abc')).toBe(true)
  })

  it('refuse hôtes internes, http, faux domaines et identifiants', () => {
    for (const u of [
      'http://gumroad.com/l/x',
      'https://169.254.169.254/latest/meta-data',
      'https://localhost:3000',
      'https://evilgumroad.com',
      'https://gumroad.com.evil.com',
      'https://user:pw@gumroad.com',
      'pas-une-url',
    ]) expect(isAllowedGumroadUrl(u)).toBe(false)
  })

  it('ne lance aucune requête pour une URL refusée', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    const res = await linkGumroad('https://169.254.169.254/x')
    expect(res.status).toBe('error')
    expect(f).not.toHaveBeenCalled()
  })

  it('ne suit pas les redirections et ne renvoie pas le détail de l\'erreur', async () => {
    const f = vi.fn().mockRejectedValue(new Error('ECONNREFUSED 10.0.0.1:5432'))
    vi.stubGlobal('fetch', f)
    const res = await linkGumroad('https://gumroad.com/l/x')
    expect(f.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
    expect(res.status).toBe('error')
    expect(res.error).not.toMatch(/10\.0\.0\.1/)
  })
})

describe('aperçu maintenance', () => {
  it('le cookie ne contient pas le secret et est déterministe', async () => {
    const v = await previewCookieValue('mon-secret')
    expect(v).not.toContain('mon-secret')
    expect(v).toMatch(/^[0-9a-f]{64}$/)
    expect(await previewCookieValue('mon-secret')).toBe(v)
    expect(await previewCookieValue('autre')).not.toBe(v)
  })

  it('safeEqual compare correctement', async () => {
    expect(await safeEqual('abc', 'abc')).toBe(true)
    expect(await safeEqual('abc', 'abd')).toBe(false)
    expect(await safeEqual('abc', 'abcd')).toBe(false)
  })
})
