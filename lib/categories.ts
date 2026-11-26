/** Rubriques du site. Un article appartient à une ou plusieurs rubriques, déduites de ses tags. */
export const CATEGORY_SLUGS = [
  'ia-llm', 'agents', 'architecture', 'api', 'automatisation', 'rag', 'tutoriels', 'transformation', 'ops',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** Tags de 3 caractères ou moins : comparaison exacte ; sinon : « contient ». */
const MATCHERS: Record<CategorySlug, string[]> = {
  'ia-llm': ['ai', 'ia', 'llm', 'claude', 'openai', 'gpt', 'gemini', 'machine-learning', 'genai'],
  agents: ['agent', 'mcp', 'claude-code', 'langgraph', 'copilot'],
  architecture: ['architecture', 'integration', 'intégration', 'saas', 'supabase', 'nextjs', 'microservice', 'platform', 'plateforme'],
  api: ['api', 'rest', 'graphql', 'nodejs', 'typescript', 'sdk', 'webhook'],
  automatisation: ['n8n', 'make', 'automatisation', 'automation', 'ansible', 'ci-cd', 'cicd', 'github-actions', 'gitlab', 'terraform'],
  rag: ['rag', 'vector', 'embedding', 'pgvector', 'opensearch', 'mongodb', 'database', 'postgres'],
  tutoriels: ['tutorial', 'tutoriel', 'cheatsheet', 'cka', 'kubectl', 'guide', 'howto'],
  transformation: ['transformation', 'gouvernance', 'governance', 'conformité', 'compliance', 'roi', 'conseil', 'consulting'],
  ops: ['kubernetes', 'k8s', 'sre', 'devops', 'incident', 'postmortem', 'post-mortem', 'observabilit', 'monitoring', 'prometheus', 'oom', 'debugging'],
};

function matches(tag: string, matcher: string): boolean {
  return matcher.length <= 3 ? tag === matcher : tag.includes(matcher);
}

export function categoriesOf(tags: string[]): CategorySlug[] {
  const norm = tags.map(t => t.toLowerCase());
  const found = CATEGORY_SLUGS.filter(slug => norm.some(tag => MATCHERS[slug].some(m => matches(tag, m))));
  return found.length > 0 ? found : ['architecture'];
}

export function isCategory(slug: string): slug is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(slug);
}

/** Articles proches : même rubrique et tags communs. Les plus récents l'emportent à score égal. */
export function relatedPosts<T extends { slug: string; tags: string[]; date: string }>(
  current: { slug: string; tags: string[] }, all: T[], limit = 3,
): T[] {
  const curTags = new Set(current.tags.map(t => t.toLowerCase()));
  const curCats = new Set(categoriesOf(current.tags));
  return all
    .filter(p => p.slug !== current.slug)
    .map(p => {
      const sharedTags = p.tags.filter(t => curTags.has(t.toLowerCase())).length;
      const sharedCats = categoriesOf(p.tags).filter(c => curCats.has(c)).length;
      return { p, score: sharedTags * 2 + sharedCats };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.date.localeCompare(a.p.date))
    .slice(0, limit)
    .map(x => x.p);
}
