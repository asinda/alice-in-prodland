// lib/__tests__/instagram.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('postToInstagram', () => {
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
    delete process.env.INSTAGRAM_ACCESS_TOKEN
    delete process.env.INSTAGRAM_ACCOUNT_ID
    const { postToInstagram } = await import('../integrations/instagram')
    const result = await postToInstagram({ imageUrl: 'https://example.com/img.png', caption: 'Test' })
    expect(result.status).toBe('skipped')
  })

  it('publie en 2 étapes et retourne success avec id', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'token123'
    process.env.INSTAGRAM_ACCOUNT_ID = 'account123'
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_abc' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'post_xyz' }) } as Response)
    const { postToInstagram } = await import('../integrations/instagram')
    const result = await postToInstagram({ imageUrl: 'https://example.com/img.png', caption: 'Hello #devops' })
    expect(result.status).toBe('success')
    expect(result.id).toBe('post_xyz')
  })

  it('retourne error si la création du container échoue', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'token'
    process.env.INSTAGRAM_ACCOUNT_ID = 'acct'
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'Bad request' } as Response)
    const { postToInstagram } = await import('../integrations/instagram')
    const result = await postToInstagram({ imageUrl: 'https://x.com/img.png', caption: 'Test' })
    expect(result.status).toBe('error')
    expect(result.error).toContain('400')
  })
})
