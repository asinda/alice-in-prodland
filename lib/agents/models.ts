/** IDs de modèles centralisés. Surchargeables par variables d'environnement. */
export const MODELS = {
  /** Tâches courtes/structurées : traduction, amélioration SEO */
  fast: process.env.ANTHROPIC_MODEL_FAST ?? 'claude-haiku-5-5',
  /** Rédaction de contenu social */
  quality: process.env.ANTHROPIC_MODEL_QUALITY ?? 'claude-sonnet-5-5',
  /** Relecture technique : tâche de rigueur, déclenchée à la demande uniquement */
  review: process.env.ANTHROPIC_MODEL_REVIEW ?? 'claude-opus-5-5',
} as const

/** Lève une erreur si la sortie a été tronquée (JSON d'outil potentiellement invalide). */
export function assertNotTruncated(stopReason: string | null | undefined, agent: string): void {
  if (stopReason === 'max_tokens') {
    throw new Error(`[${agent}] réponse tronquée (max_tokens atteint)`)
  }
}
