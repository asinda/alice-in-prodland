import type { IntegrationResult } from '../db';

interface LinkedInPayload {
  title: string;
  excerpt: string;
  url: string;
  tags: string[];
}

function buildPostText({ title, excerpt, url, tags }: LinkedInPayload): string {
  const hashtags = tags.slice(0, 5).map(t => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`).join(' ');
  return [
    `📝 ${title}`,
    '',
    excerpt,
    '',
    `→ ${url}`,
    '',
    hashtags,
  ].filter(Boolean).join('\n');
}

export async function postToLinkedIn(payload: LinkedInPayload): Promise<IntegrationResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    return { status: 'skipped', error: 'LINKEDIN_ACCESS_TOKEN ou LINKEDIN_PERSON_URN manquant dans .env.local' };
  }

  const body = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: buildPostText(payload) },
        shareMediaCategory: 'ARTICLE',
        media: [{
          status: 'READY',
          description: { text: payload.excerpt || payload.title },
          originalUrl: payload.url,
          title: { text: payload.title },
        }],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  try {
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return { status: 'error', error: `LinkedIn ${res.status}: ${err}` };
    }

    const postId = res.headers.get('x-restli-id') ?? 'unknown';
    return {
      status: 'success',
      id: postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
      pushedAt: new Date().toISOString(),
    };
  } catch (e) {
    return { status: 'error', error: String(e) };
  }
}
