import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/schedule', () => ({
  claimNextPending: vi.fn(),
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
vi.mock('@/lib/agents/distribute', () => ({
  generateAndDistribute: vi.fn(),
  prepareSocialDraft: vi.fn(),
  isAutoPostEnabled: vi.fn(() => true),
}))

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
    const { claimNextPending } = await import('@/lib/schedule')
    vi.mocked(claimNextPending).mockReturnValue(null)
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    const body = await res.json()
    expect(body.status).toBe('no_pending')
  })

  it('publie un post DB existant et retourne published', async () => {
    const { claimNextPending } = await import('@/lib/schedule')
    const { getPostBySlug } = await import('@/lib/db')
    const { generateAndDistribute } = await import('@/lib/agents/distribute')
    vi.mocked(claimNextPending).mockReturnValue({
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
    vi.mocked(generateAndDistribute).mockResolvedValue({ failed: false })
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    const body = await res.json()
    expect(body.status).toBe('published')
    expect(body.slug).toBe('mon-post')
  })

  it('importe un post FS introuvable en DB, puis le publie', async () => {
    const { claimNextPending } = await import('@/lib/schedule')
    const { getPostBySlug, createPost } = await import('@/lib/db')
    const { getFsPostRaw } = await import('@/lib/posts')
    const { generateAndDistribute } = await import('@/lib/agents/distribute')

    vi.mocked(claimNextPending).mockReturnValue({
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
    vi.mocked(generateAndDistribute).mockResolvedValue({ failed: false })

    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    const body = await res.json()
    expect(body.status).toBe('published')
    expect(body.slug).toBe('fs-post')
    expect(vi.mocked(createPost)).toHaveBeenCalledOnce()
  })
})

describe('POST /api/schedule/publish - robustesse', () => {
  beforeEach(() => {
    process.env.PUBLISH_SECRET = 'secret-de-test-32-caracteres-min'
    vi.resetModules()
    vi.clearAllMocks()
  })

  const entry = { id: 's1', slug: 'p', source: 'db' as const, scheduledAt: '2026-01-01T09:00:00Z', status: 'processing' as const }
  const post = (status: 'draft' | 'published') => ({
    id: 'post1', slug: 'p', title: 'P', excerpt: '', content: '', tags: [], type: 'post' as const, status,
    publishedAt: null, createdAt: '', updatedAt: '',
    integrations: { linkedin: { status: 'idle' as const }, gumroad: { status: 'idle' as const }, tiktok: { status: 'idle' as const }, instagram: { status: 'idle' as const }, youtube: { status: 'idle' as const } },
  })

  it('ne republie pas un post deja publie', async () => {
    const { claimNextPending } = await import('@/lib/schedule')
    const { getPostBySlug, publishPost } = await import('@/lib/db')
    const { generateAndDistribute } = await import('@/lib/agents/distribute')
    vi.mocked(claimNextPending).mockReturnValue(entry)
    vi.mocked(getPostBySlug).mockReturnValue(post('published'))
    vi.mocked(generateAndDistribute).mockResolvedValue({ failed: false })
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    expect((await res.json()).status).toBe('published')
    expect(publishPost).not.toHaveBeenCalled()
  })

  it('marque failed (et pas published) si la distribution echoue', async () => {
    const { claimNextPending, markPublished, markFailed } = await import('@/lib/schedule')
    const { getPostBySlug } = await import('@/lib/db')
    const { generateAndDistribute } = await import('@/lib/agents/distribute')
    vi.mocked(claimNextPending).mockReturnValue(entry)
    vi.mocked(getPostBySlug).mockReturnValue(post('published'))
    vi.mocked(generateAndDistribute).mockResolvedValue({ failed: true })
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    expect(res.status).toBe(502)
    expect(markFailed).toHaveBeenCalled()
    expect(markPublished).not.toHaveBeenCalled()
  })
})

describe('POST /api/schedule/publish - validation humaine', () => {
  beforeEach(() => {
    process.env.PUBLISH_SECRET = 'secret-de-test-32-caracteres-min'
    vi.resetModules()
    vi.clearAllMocks()
  })

  const entry = { id: 's1', slug: 'p', source: 'db' as const, scheduledAt: '2026-01-01T09:00:00Z', status: 'processing' as const }
  const post = {
    id: 'post1', slug: 'p', title: 'P', excerpt: '', content: '', tags: [], type: 'post' as const, status: 'published' as const,
    publishedAt: null, createdAt: '', updatedAt: '',
    integrations: { linkedin: { status: 'idle' as const }, gumroad: { status: 'idle' as const }, tiktok: { status: 'idle' as const }, instagram: { status: 'idle' as const }, youtube: { status: 'idle' as const } },
  }

  it('par defaut, prepare un brouillon et ne poste RIEN', async () => {
    const { claimNextPending, markPublished } = await import('@/lib/schedule')
    const { getPostBySlug } = await import('@/lib/db')
    const dist = await import('@/lib/agents/distribute')
    vi.mocked(dist.isAutoPostEnabled).mockReturnValue(false)
    vi.mocked(claimNextPending).mockReturnValue(entry)
    vi.mocked(getPostBySlug).mockReturnValue(post)
    vi.mocked(dist.prepareSocialDraft).mockResolvedValue({} as never)
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    expect((await res.json()).status).toBe('published_pending_approval')
    expect(dist.prepareSocialDraft).toHaveBeenCalled()
    expect(dist.generateAndDistribute).not.toHaveBeenCalled()
    expect(markPublished).toHaveBeenCalled()
  })

  it('marque failed si la generation du brouillon echoue', async () => {
    const { claimNextPending, markFailed, markPublished } = await import('@/lib/schedule')
    const { getPostBySlug } = await import('@/lib/db')
    const dist = await import('@/lib/agents/distribute')
    vi.mocked(dist.isAutoPostEnabled).mockReturnValue(false)
    vi.mocked(claimNextPending).mockReturnValue(entry)
    vi.mocked(getPostBySlug).mockReturnValue(post)
    vi.mocked(dist.prepareSocialDraft).mockRejectedValue(new Error('boom'))
    const { POST } = await import('@/app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    expect(res.status).toBe(502)
    expect(markFailed).toHaveBeenCalled()
    expect(markPublished).not.toHaveBeenCalled()
  })
})
