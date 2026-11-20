import { z } from 'zod'
import { MODELS } from './models'
import { callTool, noEmDash, untrusted } from './runtime'

export interface TranslateOutput {
  title: string
  excerpt: string
  content: string
}

/** La traduction doit être complète : une sortie bien plus courte que la source est une troncature ou un résumé. */
export function translateSchema(sourceLength: number) {
  const minContent = Math.floor(sourceLength * 0.4)
  return z.object({
    title: z.string().trim().min(1).max(300).transform(noEmDash),
    excerpt: z.string().trim().max(600).transform(noEmDash),
    content: z.string().min(Math.max(1, minContent), `contenu trop court (minimum ${minContent} caractères, la traduction semble incomplète)`),
  })
}

export async function translatePost(
  post: { title: string; excerpt: string; content: string },
  from: 'fr' | 'en',
  to: 'fr' | 'en'
): Promise<TranslateOutput> {
  return callTool<TranslateOutput>({
    agent: 'translate',
    model: MODELS.fast,
    maxTokens: 16000,
    timeoutMs: 180_000,
    schema: translateSchema(post.content.length),
    tool: {
      name: 'translation_output',
      description: 'Retourne le contenu traduit',
      input_schema: {
        type: 'object' as const,
        properties: {
          title:   { type: 'string', description: 'Titre traduit' },
          excerpt: { type: 'string', description: 'Excerpt traduit' },
          content: { type: 'string', description: 'Contenu Markdown traduit intégralement' },
        },
        required: ['title', 'excerpt', 'content'],
      },
    },
    prompt: `Traduis ce contenu de blog technique SRE/DevOps du ${from === 'fr' ? 'français' : 'anglais'} vers le ${to === 'fr' ? 'français' : 'anglais'}.

Règles :
- Garde exactement la même structure Markdown (titres, code blocks, listes)
- Ne traduis pas les commandes, noms de variables, snippets de code
- Ton naturel et technique, n'utilise jamais le tiret long (—)
- Traduis le titre et l'excerpt aussi

${untrusted('article', `Titre : ${post.title}
Excerpt : ${post.excerpt}

Contenu :
${post.content}`)}`,
  })
}
