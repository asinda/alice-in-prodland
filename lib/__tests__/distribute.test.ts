import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, Record<string, unknown>>()

vi.mock('../social-drafts', () => ({
  getDraft: vi.fn((id: string) => store.get(id) ?? null),
  getOpenDraftForPost: vi.fn(() => null),
  createDraft: vi.fn(),
  updateDraft: vi.fn((id: string, patch: Record<string, unknown>) => {
    store.set(id, { ...store.get(id), ...patch })
  }),
}))
vi.mock('../db', () => ({ getPostById: vi.fn(), updatePost: vi.fn() }))
vi.mock('../content-status', () => ({ setContentStatus: vi.fn() }))
vi.mock('../agents/social', () => ({ generateSocialContent: vi.fn() }))
vi.mock('../social-image', () => ({ generateSocialImage: vi.fn(), saveSocialImage: vi.fn() }))
vi.mock('../integrations/linkedin', () => ({ postToLinkedIn: vi.fn() }))
vi.mock('../integrations/instagram', () => ({ postToInstagram: vi.fn() }))
vi.mock('../integrations/youtube', () => ({ postYoutubeCommunity: vi.fn() }))
vi.mock('../integrations/tiktok', () => ({ prepareTikTokPost: vi.fn() }))

const ok = { status: 'success' as const }
const idle = { status: 'idle' as const }
const basePost = (integrations: Record<string, { status: string }>) => ({
  id: 'p1', slug: 's', title: 'T', excerpt: 'E', content: 'C', tags: [], type: 'post',
  integrations: { linkedin: idle, gumroad: idle, tiktok: idle, instagram: idle, youtube: idle, ...integrations },
})

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  store.clear()
  store.set('d1', {
    id: 'd1', postId: 'p1', slug: 's', title: 'T', excerpt: 'E', url: 'http://x/blog/s',
    imageUrl: 'http://x/social/s.png', linkedinTeaser: 'TEASER', instagramCaption: 'IG', youtubePost: 'YT', status: 'pending',
  })
})

describe('publishDraft', () => {
  it('poste sur les 3 plateformes avec les textes du brouillon et marque posted', async () => {
    const db = await import('../db')
    const li = await import('../integrations/linkedin')
    const ig = await import('../integrations/instagram')
    const yt = await import('../integrations/youtube')
    const tt = await import('../integrations/tiktok')
    vi.mocked(db.getPostById).mockReturnValue(basePost({}) as never)
    vi.mocked(li.postToLinkedIn).mockResolvedValue(ok)
    vi.mocked(ig.postToInstagram).mockResolvedValue(ok)
    vi.mocked(yt.postYoutubeCommunity).mockResolvedValue(ok)
    vi.mocked(tt.prepareTikTokPost).mockResolvedValue(ok as never)

    const { publishDraft } = await import('../agents/distribute')
    const res = await publishDraft('d1')
    expect(res.failed).toBe(false)
    expect(li.postToLinkedIn).toHaveBeenCalledWith(expect.objectContaining({ text: 'TEASER', url: 'http://x/blog/s' }))
    expect(ig.postToInstagram).toHaveBeenCalledWith({ imageUrl: 'http://x/social/s.png', caption: 'IG' })
    expect(yt.postYoutubeCommunity).toHaveBeenCalledWith({ text: 'YT' })
    expect(store.get('d1')?.status).toBe('posted')
  })

  it('est idempotent : ne reposte pas une plateforme deja en succes', async () => {
    const db = await import('../db')
    const li = await import('../integrations/linkedin')
    const ig = await import('../integrations/instagram')
    const yt = await import('../integrations/youtube')
    const tt = await import('../integrations/tiktok')
    vi.mocked(db.getPostById).mockReturnValue(basePost({ linkedin: ok, instagram: ok }) as never)
    vi.mocked(yt.postYoutubeCommunity).mockResolvedValue(ok)
    vi.mocked(tt.prepareTikTokPost).mockResolvedValue(ok as never)

    const { publishDraft } = await import('../agents/distribute')
    await publishDraft('d1')
    expect(li.postToLinkedIn).not.toHaveBeenCalled()
    expect(ig.postToInstagram).not.toHaveBeenCalled()
    expect(yt.postYoutubeCommunity).toHaveBeenCalledTimes(1)
  })

  it('ne fait rien pour un brouillon deja publie, refuse un brouillon rejete', async () => {
    const li = await import('../integrations/linkedin')
    const { publishDraft } = await import('../agents/distribute')
    store.set('d1', { ...store.get('d1'), status: 'posted' })
    expect((await publishDraft('d1')).failed).toBe(false)
    store.set('d1', { ...store.get('d1'), status: 'rejected' })
    expect((await publishDraft('d1')).failed).toBe(true)
    expect(li.postToLinkedIn).not.toHaveBeenCalled()
  })

  it('marque failed quand toutes les plateformes echouent (relancable)', async () => {
    const db = await import('../db')
    const li = await import('../integrations/linkedin')
    const ig = await import('../integrations/instagram')
    const yt = await import('../integrations/youtube')
    const tt = await import('../integrations/tiktok')
    vi.mocked(db.getPostById).mockReturnValue(basePost({}) as never)
    const err = { status: 'error' as const, error: 'x' }
    vi.mocked(li.postToLinkedIn).mockResolvedValue(err)
    vi.mocked(ig.postToInstagram).mockResolvedValue(err)
    vi.mocked(yt.postYoutubeCommunity).mockResolvedValue(err)
    vi.mocked(tt.prepareTikTokPost).mockResolvedValue(ok as never)

    const { publishDraft } = await import('../agents/distribute')
    expect((await publishDraft('d1')).failed).toBe(true)
    expect(store.get('d1')?.status).toBe('failed')
  })
})

describe('isAutoPostEnabled', () => {
  it('est desactive par defaut et actif seulement avec SOCIAL_AUTO_POST=true', async () => {
    // Données isolées : le réglage réel (data/settings.json) ne doit pas influencer ce test.
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aip-env-'))
    fs.mkdirSync(path.join(dir, 'data'))
    const spy = vi.spyOn(process, 'cwd').mockReturnValue(dir)
    try {
      const { isAutoPostEnabled } = await import('../agents/distribute')
      delete process.env.SOCIAL_AUTO_POST
      expect(isAutoPostEnabled()).toBe(false)
      process.env.SOCIAL_AUTO_POST = 'true'
      expect(isAutoPostEnabled()).toBe(true)
    } finally {
      delete process.env.SOCIAL_AUTO_POST
      spy.mockRestore()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('isAutoPostEnabled via réglage admin', () => {
  it('suit le réglage enregistré (data/settings.json) et reste désactivé si illisible', async () => {
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aip-set-'))
    fs.mkdirSync(path.join(dir, 'data'))
    const spy = vi.spyOn(process, 'cwd').mockReturnValue(dir)
    try {
      delete process.env.SOCIAL_AUTO_POST
      const { isAutoPostEnabled } = await import('../agents/distribute')
      expect(isAutoPostEnabled()).toBe(false)
      fs.writeFileSync(path.join(dir, 'data', 'settings.json'), '{"autoPost":true}')
      expect(isAutoPostEnabled()).toBe(true)
      fs.writeFileSync(path.join(dir, 'data', 'settings.json'), '{"tronq')
      expect(isAutoPostEnabled()).toBe(false)
    } finally {
      spy.mockRestore()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
