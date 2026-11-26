// lib/agents/improve.ts
import { z } from 'zod'
import { MODELS } from './models'
import { callTool, noEmDash, untrusted } from './runtime'

export interface ImproveOutput {
  improvedTitle: string
  improvedExcerpt: string
  suggestions: string[]
  addedTags: string[]
}

const text = (max: number) => z.string().trim().min(1).max(max).transform(noEmDash)

export const improveSchema = z.object({
  improvedTitle: text(70),
  improvedExcerpt: text(150),
  suggestions: z.array(text(400)).length(3),
  addedTags: z.array(z.string().trim().min(1).max(30)).max(10),
})

export async function improvePost(post: {
  slug: string
  title: string
  excerpt: string
  content: string
  tags: string[]
}): Promise<ImproveOutput> {
  return callTool<ImproveOutput>({
    agent: 'improve',
    model: MODELS.fast,
    maxTokens: 1024,
    schema: improveSchema,
    tool: {
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
    },
    prompt: `Tu es un expert SEO pour un blog SRE/DevOps francophone (Jambo). Améliore ce contenu.

${untrusted('article', `Titre: ${post.title}
Excerpt: ${post.excerpt}
Tags: ${post.tags.join(', ')}

Contenu (extrait):
${post.content.slice(0, 3000)}`)}

IMPORTANT : n'utilise jamais le tiret long (—) dans le texte généré.`,
  })
}
