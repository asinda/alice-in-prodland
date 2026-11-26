/** Type d'un article, déduit de ses sujets. Sert de « niveau de log » dans le fil d'articles. */
export type Kind = 'incident' | 'guide' | 'analyse';

const INCIDENT = new Set(['postmortem', 'post-mortem', 'incident', 'incidents', 'oom', 'debugging', 'outage']);
const GUIDE = new Set(['cheatsheet', 'kubectl', 'cka', 'certification', 'tutorial', 'tutoriel']);

export function kindOf(tags: string[]): Kind {
  const lower = tags.map(t => t.toLowerCase());
  if (lower.some(t => INCIDENT.has(t))) return 'incident';
  if (lower.some(t => GUIDE.has(t))) return 'guide';
  return 'analyse';
}
