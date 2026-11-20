// Aperçu en mode maintenance. Compatible Edge (Web Crypto uniquement).
// Le cookie ne contient JAMAIS le secret : c'est un HMAC-SHA256 dérivé.

const enc = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Valeur du cookie `preview-token` dérivée du secret (non réversible). */
export async function previewCookieValue(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode('preview-cookie-v1')))
}

/** Comparaison en temps constant (les deux chaînes sont d'abord condensées en SHA-256). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const x = new Uint8Array(ha)
  const y = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}
