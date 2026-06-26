// lib/__tests__/improve-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockOutput: import('../agents/improve').ImproveOutput = {
  improvedTitle: 'Kubectl en production : le cheatsheet complet 2026',
  improvedExcerpt: 'Toutes les commandes kubectl essentielles pour le quotidien SRE.',
  suggestions: ['Ajouter section kubectl debug', 'Mettre à jour les exemples k8s 1.31', 'Ajouter liens vers la doc officielle'],
  addedTags: ['kubectl', 'cheatsheet'],
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{
            type: 'tool_use',
            name: 'improve_content',
            input: mockOutput,
          }],
        }),
      },
    }
  }),
}))

describe('improvePost', () => {
  beforeEach(() => { vi.resetModules() })

  it('retourne les 4 champs requis', async () => {
    const { improvePost } = await import('../agents/improve')
    const result = await improvePost({
      slug: 'kubectl-cheatsheet',
      title: 'Kubectl cheatsheet',
      excerpt: 'Les commandes kubectl.',
      content: '# Kubectl\n\nCommandes de base...',
      tags: ['kubernetes'],
    })
    expect(result).toHaveProperty('improvedTitle')
    expect(result).toHaveProperty('improvedExcerpt')
    expect(result).toHaveProperty('suggestions')
    expect(result).toHaveProperty('addedTags')
  })

  it('suggestions contient exactement 3 éléments', async () => {
    const { improvePost } = await import('../agents/improve')
    const result = await improvePost({
      slug: 'test', title: 'Test', excerpt: 'Test.', content: 'Contenu.', tags: [],
    })
    expect(result.suggestions).toHaveLength(3)
  })

  it('lève une erreur si Claude ne retourne pas de tool_use', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    vi.mocked(Anthropic).mockImplementationOnce(function () {
      return {
        messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'oops' }] }) },
      }
    } as never)
    vi.resetModules()
    const { improvePost } = await import('../agents/improve')
    await expect(improvePost({ slug: 's', title: 't', excerpt: 'e', content: 'c', tags: [] }))
      .rejects.toThrow('No tool use in response')
  })
})
