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
    system: `Tu améliores le titre et l'excerpt d'articles de blog SRE/DevOps pour alice-in-prodland (blog d'Alice Sindayigaya, DevOps Architect chez Cegedim).

STYLE ATTENDU : titre et excerpt qui sonnent écrits par une vraie SRE, pas par un copywriter. Directs, techniques, parfois avec un angle terrain ou une tension concrète ("quand ton cluster tombe à 3h du mat", "ce que personne ne dit sur le HPA").

INTERDICTIONS pour le titre et l'excerpt :
- pas de tirets longs (—)
- pas de "Découvrez comment...", "Apprenez à...", "Tout ce que vous devez savoir sur..."
- pas de superlatifs vides ("ultime", "parfait", "révolutionnaire")
- pas de structure "X choses que..." sauf si vraiment pertinent
- pas de ton publicitaire ou de promesse marketing

Les suggestions de mise à jour doivent pointer des problèmes concrets (exemples périmés, commandes obsolètes, concepts mal expliqués) — pas des généralités comme "améliorer la clarté".`,
    messages: [{
      role: 'user',
      content: `Améliore ce contenu de blog.

Titre actuel: ${post.title}
Excerpt actuel: ${post.excerpt}
Tags: ${post.tags.join(', ')}

Contenu (extrait):
${post.content.slice(0, 3000)}`,
    }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response')
  return toolUse.input as ImproveOutput
}
