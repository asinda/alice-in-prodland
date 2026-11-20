// Relecteur technique : SUGGESTIONS uniquement, jamais d'application automatique.
import { z } from 'zod'
import { MODELS } from './models'
import { callTool, noEmDash, untrusted } from './runtime'

export interface TechFinding {
  severity: 'erreur' | 'risque' | 'precision'
  line: number | null
  excerpt: string
  problem: string
  suggestion: string
}

export interface TechReviewOutput {
  summary: string
  findings: TechFinding[]
}

const t = (max: number) => z.string().trim().min(1).max(max).transform(noEmDash)

export const techReviewSchema = z.object({
  summary: t(600),
  findings: z.array(z.object({
    severity: z.enum(['erreur', 'risque', 'precision']),
    line: z.number().int().min(1).nullable(),
    excerpt: t(300),
    problem: t(500),
    suggestion: t(500),
  })).max(15),
})

/** Numérote les lignes pour que le modèle puisse les citer. */
function numbered(md: string, maxChars: number): string {
  return md.slice(0, maxChars).split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')
}

export async function reviewTechnical(post: { title: string; content: string }): Promise<TechReviewOutput> {
  return callTool<TechReviewOutput>({
    agent: 'techreview',
    model: MODELS.review,
    maxTokens: 3000,
    timeoutMs: 120_000,
    schema: techReviewSchema,
    system: "Tu es un relecteur technique SRE/DevOps senior. Tu ne signales que des problèmes réels et vérifiables. " +
      "Si tu n'es pas sûr, classe le point en 'precision' et dis-le. N'invente jamais de problème : une liste vide est une réponse valide.",
    tool: {
      name: 'tech_review',
      description: 'Retourne les problèmes techniques détectés dans l\'article',
      input_schema: {
        type: 'object' as const,
        properties: {
          summary: { type: 'string', description: 'Verdict global en 1 à 2 phrases' },
          findings: {
            type: 'array',
            description: 'Maximum 15 points, du plus grave au moins grave',
            items: {
              type: 'object',
              properties: {
                severity: { type: 'string', enum: ['erreur', 'risque', 'precision'], description: 'erreur = faux ; risque = dangereux en production ; precision = à nuancer' },
                line: { type: ['integer', 'null'], description: 'Numéro de ligne concerné, null si général' },
                excerpt: { type: 'string', description: 'Passage concerné (court)' },
                problem: { type: 'string', description: 'Ce qui est inexact ou dangereux' },
                suggestion: { type: 'string', description: 'Correction proposée' },
              },
              required: ['severity', 'line', 'excerpt', 'problem', 'suggestion'],
            },
          },
        },
        required: ['summary', 'findings'],
      },
    },
    prompt: `Relis techniquement cet article de blog SRE/DevOps : erreurs factuelles, commandes ou flags inexistants ou obsolètes, configurations dangereuses en production, versions périmées, raccourcis trompeurs. Ignore le style et l'orthographe.

${untrusted('article', `Titre: ${post.title}\n\n${numbered(post.content, 12000)}`)}

IMPORTANT : n'utilise jamais le tiret long (—).`,
  })
}
