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
    messages: [{
      role: 'user',
      content: `Tu es Alice Sindayigaya, DevOps Architect / SRE chez Cegedim. Génère du contenu social pour ce post de blog SRE/DevOps en français.

Titre: ${post.title}
Excerpt: ${post.excerpt}
URL: ${post.url}
Tags: ${post.tags.join(', ')}
Type: ${post.type}

Contenu (extrait):
${post.content.slice(0, 2000)}

Adapte le ton à chaque plateforme. Contenu en français uniquement.
IMPORTANT : n'utilise jamais le tiret long (—) dans le texte généré.`,
    }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response')
  const output = toolUse.input as SocialDistributionOutput
  output.linkedin.articleUrl = post.url
  return output
}
