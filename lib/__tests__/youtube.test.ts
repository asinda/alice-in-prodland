// lib/__tests__/youtube.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('postYoutubeCommunity', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('retourne skipped si les credentials manquent', async () => {
    delete process.env.YOUTUBE_API_KEY
    delete process.env.YOUTUBE_CHANNEL_ID
    const { postYoutubeCommunity } = await import('../integrations/youtube')
    const result = await postYoutubeCommunity({ text: 'Hello YouTube !' })
    expect(result.status).toBe('skipped')
  })

  it('retourne success avec id et url si l\'API répond OK', async () => {
    process.env.YOUTUBE_API_KEY = 'apikey123'
    process.env.YOUTUBE_CHANNEL_ID = 'channel123'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yt_post_abc' }),
    } as Response)
    const { postYoutubeCommunity } = await import('../integrations/youtube')
    const result = await postYoutubeCommunity({ text: 'Nouveau post SRE disponible !' })
    expect(result.status).toBe('success')
    expect(result.id).toBe('yt_post_abc')
    expect(result.url).toContain('yt_post_abc')
  })

  it('retourne error si l\'API renvoie une erreur HTTP', async () => {
    process.env.YOUTUBE_API_KEY = 'key'
    process.env.YOUTUBE_CHANNEL_ID = 'chan'
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'Forbidden' } as Response)
    const { postYoutubeCommunity } = await import('../integrations/youtube')
    const result = await postYoutubeCommunity({ text: 'Test' })
    expect(result.status).toBe('error')
    expect(result.error).toContain('403')
  })
})
