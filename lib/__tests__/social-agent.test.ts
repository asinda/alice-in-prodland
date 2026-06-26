// lib/__tests__/social-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSocialOutput = {
  linkedin: { text: 'Post LinkedIn sur Kubernetes...', articleUrl: 'https://alice-in-prodland.com/blog/test' },
  instagram: { caption: 'Caption Instagram #devops', imagePrompt: 'Dark background tech card' },
  youtube: { communityPost: 'Nouveau post sur Kubernetes disponible ! Vous utilisez quoi comme outil de debug ?' },
  tiktok: { caption: 'Debug Kubernetes OOM en 60s 🔥', script: '1. Reproduire le problème\n2. kubectl describe pod\n3. Lire les logs' },
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'tool_use', name: 'generate_social_content', input: mockSocialOutput }],
        }),
      },
    }
  }),
}))

describe('generateSocialContent', () => {
  beforeEach(() => { vi.resetModules() })

  it('retourne les 4 plateformes', async () => {
    const { generateSocialContent } = await import('../agents/social')
    const result = await generateSocialContent({
      title: 'Debug OOM Kubernetes', excerpt: 'Comment déboguer.', content: '# Debug\n\nContenu.', tags: ['kubernetes'], url: 'https://alice-in-prodland.com/blog/test', type: 'post',
    })
    expect(result).toHaveProperty('linkedin')
    expect(result).toHaveProperty('instagram')
    expect(result).toHaveProperty('youtube')
    expect(result).toHaveProperty('tiktok')
  })

  it('le texte LinkedIn ne dépasse pas 1500 chars', async () => {
    const { generateSocialContent } = await import('../agents/social')
    const result = await generateSocialContent({
      title: 'Test', excerpt: 'Test.', content: 'c', tags: [], url: 'https://x.com/blog/test', type: 'post',
    })
    expect(result.linkedin.text.length).toBeLessThanOrEqual(1500)
  })

  it('la caption TikTok ne dépasse pas 100 chars', async () => {
    const { generateSocialContent } = await import('../agents/social')
    const result = await generateSocialContent({
      title: 'Test', excerpt: 'Test.', content: 'c', tags: [], url: 'https://x.com/blog/test', type: 'post',
    })
    expect(result.tiktok.caption.length).toBeLessThanOrEqual(100)
  })

  it('articleUrl est l\'url du post', async () => {
    const { generateSocialContent } = await import('../agents/social')
    const result = await generateSocialContent({
      title: 'Test', excerpt: 'T.', content: 'c', tags: [], url: 'https://x.com/blog/mon-post', type: 'post',
    })
    expect(result.linkedin.articleUrl).toBe('https://x.com/blog/mon-post')
  })
})
