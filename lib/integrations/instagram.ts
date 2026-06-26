// lib/integrations/instagram.ts
import type { IntegrationResult } from '../db'

interface InstagramPayload {
  imageUrl: string
  caption: string
}

export async function postToInstagram(payload: InstagramPayload): Promise<IntegrationResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID

  if (!accessToken || !accountId) {
    return { status: 'skipped', error: 'INSTAGRAM_ACCESS_TOKEN ou INSTAGRAM_ACCOUNT_ID manquant' }
  }

  try {
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: payload.imageUrl,
          caption: payload.caption,
          access_token: accessToken,
        }),
      }
    )
    if (!containerRes.ok) {
      const err = await containerRes.text()
      return { status: 'error', error: `Instagram container ${containerRes.status}: ${err}` }
    }
    const { id: creationId } = await containerRes.json() as { id: string }

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
      }
    )
    if (!publishRes.ok) {
      const err = await publishRes.text()
      return { status: 'error', error: `Instagram publish ${publishRes.status}: ${err}` }
    }
    const { id: postId } = await publishRes.json() as { id: string }

    return { status: 'success', id: postId, url: `https://www.instagram.com/p/${postId}/`, pushedAt: new Date().toISOString() }
  } catch (e) {
    return { status: 'error', error: String(e) }
  }
}
