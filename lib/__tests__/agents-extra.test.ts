import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkTranslationConsistency, frenchDensity } from '../agents/consistency'
import { useTempCwd } from './helpers'

const { create } = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(function () { return { messages: { create } } }),
}))

const FR = `## Introduction

Voici la liste des commandes pour le debug, avec une explication dans le texte pour vous aider à bien comprendre.

\`\`\`bash
# liste les pods
kubectl get pods
\`\`\`

### Détails

Voir [la doc](https://kubernetes.io/docs) pour plus d'informations sur les pods et les services dans le cluster. ${'Texte de remplissage. '.repeat(10)}
`

const EN = `## Introduction

Here is the list of commands for debugging, with an explanation in the text to help you understand it properly.

\`\`\`bash
# list the pods
kubectl get pods
\`\`\`

### Details

See [the docs](https://kubernetes.io/docs) for more information about pods and services in the cluster. ${'Filler text. '.repeat(15)}
`

describe('checkTranslationConsistency', () => {
  it('ne signale rien pour une bonne traduction (commentaire de code traduit toléré)', () => {
    expect(checkTranslationConsistency(FR, EN)).toEqual([])
  })

  it('détecte une traduction vide ou tronquée', () => {
    expect(checkTranslationConsistency(FR, '')[0].severity).toBe('error')
    const short = checkTranslationConsistency(FR, EN.slice(0, 60))
    expect(short.some(i => /trop courte/.test(i.message))).toBe(true)
  })

  it('détecte un bloc de code manquant ou modifié', () => {
    const noCode = EN.replace(/```bash[\s\S]*?```/, '')
    expect(checkTranslationConsistency(FR, noCode).some(i => /blocs de code/.test(i.message))).toBe(true)
    const changed = EN.replace('kubectl get pods', 'kubectl get nodes')
    expect(checkTranslationConsistency(FR, changed).some(i => /modifié/.test(i.message))).toBe(true)
  })

  it('détecte titres et liens divergents', () => {
    const r = checkTranslationConsistency(FR, EN.replace('### Details', '').replace('https://kubernetes.io/docs', 'https://x.io'))
    expect(r.some(i => /Titres h3/.test(i.message))).toBe(true)
    expect(r.some(i => /lien/.test(i.message))).toBe(true)
  })

  it('détecte du français résiduel mais ignore le code', () => {
    expect(frenchDensity(FR)).toBeGreaterThan(15)
    expect(checkTranslationConsistency(FR, FR).some(i => /français résiduel/.test(i.message))).toBe(true)
    const codeOnlyFrench = '```\n' + 'le la les des est une pour avec dans qui '.repeat(30) + '\n```\n' + EN
    expect(frenchDensity(codeOnlyFrench)).toBeLessThan(15)
  })
})

describe('reviewTechnical', () => {
  let tmp: ReturnType<typeof useTempCwd>
  beforeEach(() => { vi.resetModules(); create.mockReset(); tmp = useTempCwd() })
  afterEach(() => tmp.cleanup())

  const reply = (input: unknown) => ({
    content: [{ type: 'tool_use', name: 'tech_review', input }],
    usage: { input_tokens: 10, output_tokens: 10 },
  })

  it('numérote les lignes, utilise le modèle de relecture et accepte une liste vide', async () => {
    create.mockResolvedValue(reply({ summary: 'RAS', findings: [] }))
    const { reviewTechnical } = await import('../agents/techreview')
    const r = await reviewTechnical({ title: 't', content: 'a\nb\nc' })
    expect(r.findings).toEqual([])
    const call = create.mock.calls[0][0]
    expect(call.model).toBe('claude-opus-5-5')
    expect(call.messages[0].content).toContain('2: b')
  })

  it('rejette une sévérité inconnue après nouvel essai', async () => {
    create.mockResolvedValue(reply({
      summary: 's',
      findings: [{ severity: 'critique', line: 1, excerpt: 'x', problem: 'p', suggestion: 's' }],
    }))
    const { reviewTechnical } = await import('../agents/techreview')
    await expect(reviewTechnical({ title: 't', content: 'c' })).rejects.toThrow(/sortie invalide/)
    expect(create).toHaveBeenCalledTimes(2)
  })
})
