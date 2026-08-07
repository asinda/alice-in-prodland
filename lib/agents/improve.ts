// lib/agents/improve.ts
import Anthropic from '@anthropic-ai/sdk'

export interface ImproveOutput {
  improvedTitle: string
  improvedExcerpt: string
  suggestions: string[]
  addedTags: string[]
}

export async function improvePost(post: {
  slug: string
  title: string
  excerpt: string
  content: string
  tags: string[]
}): Promise<ImproveOutput> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [{
      name: 'improve_content',
      description: 'Retourne le contenu amélioré pour le SEO',
      input_schema: {
        type: 'object' as const,
        properties: {
          improvedTitle: { type: 'string', description: 'Titre optimisé SEO, max 70 chars' },
          improvedExcerpt: { type: 'string', description: 'Excerpt accrocheur, max 150 chars' },
          suggestions: { type: 'array', items: { type: 'string' }, description: 'Exactement 3 suggestions de mise à jour du contenu' },
          addedTags: { type: 'array', items: { type: 'string' }, description: 'Tags manquants à ajouter' },
        },
        required: ['improvedTitle', 'improvedExcerpt', 'suggestions', 'addedTags'],
      },
    }],
    tool_choice: { type: 'tool', name: 'improve_content' },
    messages: [{
      role: 'user',
      content: `Tu es un expert SEO pour un blog SRE/DevOps francophone (alice-in-prodland). Améliore ce contenu.

Titre: ${post.title}
Excerpt: ${post.excerpt}
Tags: ${post.tags.join(', ')}

Contenu (extrait):
${post.content.slice(0, 3000)}

IMPORTANT : n'utilise jamais le tiret long (—) dans le texte généré.`,
    }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response')
  return toolUse.input as ImproveOutput
}
