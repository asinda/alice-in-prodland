import Anthropic from '@anthropic-ai/sdk'

export interface TranslateOutput {
  title: string
  excerpt: string
  content: string
}

export async function translatePost(
  post: { title: string; excerpt: string; content: string },
  from: 'fr' | 'en',
  to: 'fr' | 'en'
): Promise<TranslateOutput> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8096,
    tools: [{
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
    }],
    tool_choice: { type: 'tool', name: 'translation_output' },
    messages: [{
      role: 'user',
      content: `Traduis ce contenu de blog technique SRE/DevOps du ${from === 'fr' ? 'français' : 'anglais'} vers le ${to === 'fr' ? 'français' : 'anglais'}.

Règles :
- Garde exactement la même structure Markdown (titres, code blocks, listes)
- Ne traduis pas les commandes, noms de variables, snippets de code
- Ton naturel et technique, n'utilise jamais le tiret long (—)
- Traduis le titre et l'excerpt aussi

Titre : ${post.title}
Excerpt : ${post.excerpt}

Contenu :
${post.content}`,
    }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response')
  return toolUse.input as TranslateOutput
}
