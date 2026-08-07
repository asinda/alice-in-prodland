// lib/agents/social.ts
import Anthropic from '@anthropic-ai/sdk'

export interface SocialDistributionOutput {
  linkedin: { text: string; articleUrl: string }
  instagram: { caption: string; imagePrompt: string }
  youtube: { communityPost: string }
  tiktok: { caption: string; script: string }
}

export async function generateSocialContent(post: {
  title: string
  excerpt: string
  content: string
  tags: string[]
  url: string
  type: string
}): Promise<SocialDistributionOutput> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [{
      name: 'generate_social_content',
      description: 'Génère le contenu social adapté à chaque plateforme',
      input_schema: {
        type: 'object' as const,
        properties: {
          linkedin: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Texte LinkedIn, 1200-1500 chars max, ton professionnel, 5 hashtags max' },
              articleUrl: { type: 'string', description: 'URL de l\'article' },
            },
            required: ['text', 'articleUrl'],
          },
          instagram: {
            type: 'object',
            properties: {
              caption: { type: 'string', description: 'Caption Instagram, 150-200 chars, accessible, 8 hashtags max' },
              imagePrompt: { type: 'string', description: 'Description du visuel pour la carte sociale' },
            },
            required: ['caption', 'imagePrompt'],
          },
          youtube: {
            type: 'object',
            properties: {
              communityPost: { type: 'string', description: 'Community post YouTube, 300-500 chars, question ouverte + lien' },
            },
            required: ['communityPost'],
          },
          tiktok: {
            type: 'object',
            properties: {
              caption: { type: 'string', description: 'Caption TikTok, 80-100 chars max, accrocheur' },
              script: { type: 'string', description: '5-7 bullet points pour un short de 60s' },
            },
            required: ['caption', 'script'],
          },
        },
        required: ['linkedin', 'instagram', 'youtube', 'tiktok'],
      },
    }],
    tool_choice: { type: 'tool', name: 'generate_social_content' },
    system: `Tu es Alice Sindayigaya, DevOps Architect / SRE chez Cegedim. Tu écris en ton propre nom, à la première personne, en français.

TON STYLE : direct, technique sans jargon inutile, parfois ironique, ancré dans le terrain (incidents réels, on-call, kubectl à 3h du mat). Tu parles comme quelqu'un qui vit vraiment le sujet, pas comme quelqu'un qui en fait la promotion.

INTERDICTIONS ABSOLUES — ne jamais écrire :
- des tirets longs (—) ou des listes à tirets partout
- "En tant que professionnel(le)...", "Il est important de noter que...", "N'hésitez pas à..."
- des phrases qui commencent par "Je suis ravi(e) de partager..."
- des structures en 3 parties parfaitement symétriques
- des emojis en fin de chaque phrase
- "game-changer", "next-level", "incontournable"
- des hashtags génériques comme #Leadership #Innovation #Digital
- des conclusions moralisatrices ("Alors, êtes-vous prêt(e) à...?")
- du texte qui ressemble à une brochure marketing

STYLE PAR PLATEFORME :
- LinkedIn : post qui commence par une anecdote terrain ou une question provocatrice. Pas de structure bullet-point visible. Maximum 2-3 emojis discrets. Hashtags techniques uniquement.
- Instagram : court, visuel, parlant pour quelqu'un qui scroll vite. Ton décontracté mais pas superficiel.
- YouTube : question ouverte qui donne envie de répondre, pas de "venez lire mon article".
- TikTok : script comme si tu expliquais à quelqu'un dans le couloir, pas un exposé.`,
    messages: [{
      role: 'user',
      content: `Génère le contenu social pour ce post.

Titre: ${post.title}
Excerpt: ${post.excerpt}
URL: ${post.url}
Tags: ${post.tags.join(', ')}
Type: ${post.type}

Contenu (extrait):
${post.content.slice(0, 2000)}`,
    }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response')
  const output = toolUse.input as SocialDistributionOutput
  output.linkedin.articleUrl = post.url
  return output
}
