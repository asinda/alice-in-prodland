import type { IntegrationResult } from '../db';

interface TikTokPayload {
  title: string;
  excerpt: string;
  url: string;
  tags: string[];
  type: string;
}

const TYPE_EMOJI: Record<string, string> = {
  post: '📖',
  tutorial: '⚙️',
  course: '🎓',
};

export function generateTikTokCaption(payload: TikTokPayload): string {
  const emoji = TYPE_EMOJI[payload.type] ?? '💡';
  const hashtags = [
    ...payload.tags.slice(0, 4).map(t => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`),
    '#SRE', '#DevOps', '#Kubernetes', '#LearnToCode',
  ].slice(0, 8).join(' ');

  return [
    `${emoji} ${payload.title}`,
    '',
    payload.excerpt,
    '',
    `🔗 Lien en bio → ${payload.url}`,
    '',
    hashtags,
  ].filter(Boolean).join('\n');
}

// TikTok ne supporte pas les posts texte via API publique.
// Cette fonction génère la caption et la marque comme "prête à copier".
export async function prepareTikTokPost(payload: TikTokPayload): Promise<IntegrationResult> {
  const caption = generateTikTokCaption(payload);
  return {
    status: 'success',
    id: caption,       // on stocke la caption dans le champ id pour la récupérer dans l'UI
    url: undefined,
    pushedAt: new Date().toISOString(),
  };
}
