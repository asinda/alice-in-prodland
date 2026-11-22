// lib/agents/social.ts
import { z } from 'zod'
import { MODELS } from './models'
import { callTool, noEmDash, untrusted } from './runtime'

export interface SocialDistributionOutput {
  linkedin: { text: string; articleUrl: string }
  instagram: { caption: string; imagePrompt: string }
  youtube: { communityPost: string }
  tiktok: { caption: string; script: string }
}

const t = (max: number) => z.string().trim().min(1).max(max).transform(noEmDash)

export const socialSchema = z.object({
  // Teaser LinkedIn : court (l'URL est ajoutée par le système) ; la limite plateforme est 3000
  linkedin: z.object({ text: t(1300), articleUrl: z.string() }),
  // Limites des plateformes : Instagram 2200, YouTube community 5000, TikTok caption 150
  instagram: z.object({ caption: t(2200), imagePrompt: t(1000) }),
  youtube: z.object({ communityPost: t(5000) }),
  tiktok: z.object({ caption: t(150), script: t(3000) }),
})

export async function generateSocialContent(post: {
  title: string
  excerpt: string
  content: string
  tags: string[]
  url: string
  type: string
}): Promise<SocialDistributionOutput> {
  const output = await callTool<SocialDistributionOutput>({
    agent: 'social',
    model: MODELS.quality,
    maxTokens: 2048,
    schema: socialSchema,
    tool: {
      name: 'generate_social_content',
      description: 'Génère le contenu social adapté à chaque plateforme',
      input_schema: {
        type: 'object' as const,
        properties: {
          linkedin: {
            type: 'object',
            properties: {
              text: { type: 'string', description: "Teaser LinkedIn (600 à 1000 caractères, 1300 max) : 1re ligne = accroche percutante de 140 caractères max qui donne envie de cliquer sur 'voir plus' ; 2 à 3 puces qui annoncent ce qu'on apprend SANS révéler la conclusion ; une question finale ouverte ; 5 hashtags max sur la dernière ligne. N'inclus PAS l'URL (ajoutée par le système)." },
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
    },
    prompt: `Tu es Alice Sindayigaya, DevOps Architect / SRE chez Cegedim. Génère du contenu social pour ce post de blog SRE/DevOps en français.

${untrusted('article', `Titre: ${post.title}
Excerpt: ${post.excerpt}
URL: ${post.url}
Tags: ${post.tags.join(', ')}
Type: ${post.type}

Contenu (extrait):
${post.content.slice(0, 2000)}`)}

Adapte le ton à chaque plateforme. Contenu en français uniquement.
IMPORTANT : n'utilise jamais le tiret long (—) dans le texte généré.`,
  })

  // L'URL de l'article est toujours celle du site, jamais celle produite par le modèle
  output.linkedin.articleUrl = post.url
  return output
}
