import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/schedule', () => ({
  getNextPending: vi.fn(),
  markPublished: vi.fn(),
  markFailed: vi.fn(),
}))
vi.mock('@/lib/content-status', () => ({ setContentStatus: vi.fn() }))
vi.mock('@/lib/db', () => ({
  getPostBySlug: vi.fn(),
  publishPost: vi.fn(),
  createPost: vi.fn(),
}))
vi.mock('@/lib/posts', () => ({ getFsPostRaw: vi.fn() }))
vi.mock('@/lib/agents/distribute', () => ({ generateAndDistribute: vi.fn() }))

function makeRequest(token: string) {
  return new NextRequest('http://localhost/api/schedule/publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

describe('POST /api/schedule/publish', () => {
  beforeEach(() => {
    process.env.PUBLISH_SECRET = 'secret-de-test-32-caracteres-min'
    vi.resetModules()
  })

  it('retourne 401 si le token est invalide', async () => {
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('mauvais-token'))
    expect(res.status).toBe(401)
  })

  it('retourne no_pending si la queue est vide', async () => {
    const { getNextPending } = await import('@/lib/schedule')
    vi.mocked(getNextPending).mockReturnValue(null)
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    const body = await res.json()
    expect(body.status).toBe('no_pending')
  })

  it('publie un post DB existant et retourne published', async () => {
    const { getNextPending } = await import('@/lib/schedule')
    const { getPostBySlug } = await import('@/lib/db')
    const { generateAndDistribute } = await import('@/lib/agents/distribute')
    vi.mocked(getNextPending).mockReturnValue({
      id: 'sched1', slug: 'mon-post', source: 'db', scheduledAt: '2026-01-01T09:00:00Z', status: 'pending',
    })
    // First call (pre-publish): draft state
    vi.mocked(getPostBySlug).mockReturnValueOnce({
      id: 'post1', slug: 'mon-post', title: 'Mon post', excerpt: '', content: '', tags: [],
      type: 'post', status: 'draft', publishedAt: null,
      integrations: { linkedin: { status: 'idle' }, gumroad: { status: 'idle' }, tiktok: { status: 'idle' }, instagram: { status: 'idle' }, youtube: { status: 'idle' } },
      createdAt: '', updatedAt: '',
    })
    // Second call (post-publish re-read): published state
    vi.mocked(getPostBySlug).mockReturnValueOnce({
      id: 'post1', slug: 'mon-post', title: 'Mon post', excerpt: '', content: '', tags: [],
      type: 'post', status: 'published', publishedAt: '2026-06-26T09:00:00Z',
      integrations: { linkedin: { status: 'idle' }, gumroad: { status: 'idle' }, tiktok: { status: 'idle' }, instagram: { status: 'idle' }, youtube: { status: 'idle' } },
      createdAt: '', updatedAt: '',
    })
    vi.mocked(generateAndDistribute).mockResolvedValue(undefined)
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    const body = await res.json()
    expect(body.status).toBe('published')
    expect(body.slug).toBe('mon-post')
  })

  it('importe un post FS introuvable en DB, puis le publie', async () => {
    const { getNextPending } = await import('@/lib/schedule')
    const { getPostBySlug, createPost, publishPost } = await import('@/lib/db')
    const { getFsPostRaw } = await import('@/lib/posts')
    const { generateAndDistribute } = await import('@/lib/agents/distribute')

    vi.mocked(getNextPending).mockReturnValue({
      id: 'sched2', slug: 'fs-post', source: 'fs', scheduledAt: '2026-01-01T09:00:00Z', status: 'pending',
    })
    // First call: not in DB
    vi.mocked(getPostBySlug)
      .mockReturnValueOnce(null)
      // After createPost + publishPost: return published state
      .mockReturnValueOnce({
        id: 'new1', slug: 'fs-post', title: 'FS Post', excerpt: '', content: '', tags: [],
        type: 'post', status: 'published', publishedAt: '2026-06-26T09:00:00Z',
        integrations: { linkedin: { status: 'idle' }, gumroad: { status: 'idle' }, tiktok: { status: 'idle' }, instagram: { status: 'idle' }, youtube: { status: 'idle' } },
        createdAt: '', updatedAt: '',
      })
    vi.mocked(getFsPostRaw).mockReturnValue({
      title: 'FS Post', excerpt: 'Excerpt.', content: '# FS\n\nContent.', tags: ['devops'], date: '2026-01-01',
    })
    vi.mocked(createPost).mockReturnValue({
      id: 'new1', slug: 'fs-post', title: 'FS Post', excerpt: 'Excerpt.', content: '# FS\n\nContent.',
      tags: ['devops'], type: 'post', status: 'draft', publishedAt: null,
      integrations: { linkedin: { status: 'idle' }, gumroad: { status: 'idle' }, tiktok: { status: 'idle' }, instagram: { status: 'idle' }, youtube: { status: 'idle' } },
      createdAt: '', updatedAt: '',
    })
    vi.mocked(generateAndDistribute).mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    const body = await res.json()
    expect(body.status).toBe('published')
    expect(body.slug).toBe('fs-post')
    expect(vi.mocked(createPost)).toHaveBeenCalledOnce()
  })
})
