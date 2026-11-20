// Contrôle de cohérence FR/EN : déterministe (aucun appel IA, aucun coût).

export interface ConsistencyIssue {
  severity: 'error' | 'warning'
  message: string
}

const FENCE = /```[^\n]*\n([\s\S]*?)```/g

function extractCode(md: string): string[] {
  return [...md.matchAll(FENCE)].map(m => m[1])
}

function stripCode(md: string): string {
  return md.replace(FENCE, ' ').replace(/`[^`\n]*`/g, ' ')
}

/** Le code ne doit pas changer entre langues ; les commentaires peuvent être légitimement traduits. */
function normalizeCode(code: string): string {
  return code
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('//') && !l.startsWith('--'))
    .join('\n')
}

function headings(md: string): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const line of stripCode(md).split('\n')) {
    const m = /^(#{1,6})\s+\S/.exec(line)
    if (m) counts[m[1].length] = (counts[m[1].length] ?? 0) + 1
  }
  return counts
}

function links(md: string): Set<string> {
  return new Set([...stripCode(md).matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map(m => m[1]))
}

const FR_WORDS = new Set(['le', 'la', 'les', 'des', 'est', 'une', 'pour', 'avec', 'dans', 'qui', 'que', 'sont', 'cette', 'vous', 'nous', 'mais', 'aussi', 'sur', 'pas', 'être'])

/** Part de mots français courants (pour 1000 mots) hors blocs de code. */
export function frenchDensity(md: string): number {
  const words = stripCode(md).toLowerCase().match(/[a-zàâçéèêëîïôûùüÿœ']+/g) ?? []
  if (words.length < 50) return 0
  const fr = words.filter(w => FR_WORDS.has(w)).length
  return (fr / words.length) * 1000
}

export function checkTranslationConsistency(fr: string, en: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []
  if (!en.trim()) return [{ severity: 'error', message: 'Traduction vide' }]

  const ratio = en.length / Math.max(1, fr.length)
  if (ratio < 0.5) issues.push({ severity: 'error', message: `Traduction trop courte (${Math.round(ratio * 100)} % de la source) : probablement incomplète` })
  else if (ratio > 1.8) issues.push({ severity: 'warning', message: `Traduction beaucoup plus longue que la source (${Math.round(ratio * 100)} %)` })

  const cf = extractCode(fr)
  const ce = extractCode(en)
  if (cf.length !== ce.length) {
    issues.push({ severity: 'error', message: `Nombre de blocs de code différent (FR ${cf.length}, EN ${ce.length})` })
  } else {
    const diff = cf.filter((c, i) => normalizeCode(c) !== normalizeCode(ce[i])).length
    if (diff > 0) issues.push({ severity: 'warning', message: `${diff} bloc(s) de code modifié(s) hors commentaires` })
  }

  const hf = headings(fr)
  const he = headings(en)
  for (const level of new Set([...Object.keys(hf), ...Object.keys(he)])) {
    const a = hf[Number(level)] ?? 0
    const b = he[Number(level)] ?? 0
    if (a !== b) issues.push({ severity: 'warning', message: `Titres h${level} : ${a} en FR, ${b} en EN` })
  }

  const lf = links(fr)
  const le = links(en)
  const missing = [...lf].filter(u => !le.has(u))
  const extra = [...le].filter(u => !lf.has(u))
  if (missing.length) issues.push({ severity: 'warning', message: `${missing.length} lien(s) absent(s) de la traduction (ex. ${missing[0]})` })
  if (extra.length) issues.push({ severity: 'warning', message: `${extra.length} lien(s) ajouté(s) dans la traduction (ex. ${extra[0]})` })

  const density = frenchDensity(en)
  if (density > 15) issues.push({ severity: 'error', message: 'Texte français résiduel dans la version anglaise' })

  return issues
}
