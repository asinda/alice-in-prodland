// lib/integrations/youtube.ts
import type { IntegrationResult } from '../db'

export async function postYoutubeCommunity(payload: { text: string }): Promise<IntegrationResult> {
  const apiKey = process.env.YOUTUBE_API_KEY
  const channelId = process.env.YOUTUBE_CHANNEL_ID

  if (!apiKey || !channelId) {
    return { status: 'skipped', error: 'YOUTUBE_API_KEY ou YOUTUBE_CHANNEL_ID manquant' }
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/communityPosts?part=snippet&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippet: { channelId, type: 'text', textOriginal: payload.text },
        }),
      }
    )
    if (!res.ok) {
      const err = await res.text()
      return { status: 'error', error: `YouTube ${res.status}: ${err}` }
    }
    const data = await res.json() as { id: string }
    return { status: 'success', id: data.id, url: `https://www.youtube.com/post/${data.id}`, pushedAt: new Date().toISOString() }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}
