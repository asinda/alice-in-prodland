import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'node:crypto'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const sha = (v: string) => createHash('sha256').update(v).digest()

function authorized(req: NextRequest): boolean {
  const secret = process.env.BACKUP_SECRET
  if (!secret || secret.length < 16) return false
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  return timingSafeEqual(sha(token), sha(secret))
}

/**
 * Export JSON de toutes les données du volume (data/*.json + traductions).
 * Appelé par un job externe (cron) avec `Authorization: Bearer $BACKUP_SECRET`.
 * Désactivé tant que BACKUP_SECRET n'est pas défini (16 caractères minimum).
 */
export function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dataDir = path.join(process.cwd(), 'data')
  const files: Record<string, unknown> = {}
  for (const name of fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : []) {
    // Les bundles sont régénérés au build ; .bak/.tmp sont des artefacts internes
    if (!name.endsWith('.json') || name.endsWith('-bundle.json')) continue
    try {
      files[name] = JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'))
    } catch {
      files[name] = { __error: 'illisible ou corrompu' }
    }
  }

  const translations: Record<string, string> = {}
  const trDir = path.join(dataDir, 'translations-en')
  if (fs.existsSync(trDir)) {
    for (const f of fs.readdirSync(trDir)) {
      if (f.endsWith('.md')) translations[f] = fs.readFileSync(path.join(trDir, f), 'utf8')
    }
  }

  return new NextResponse(JSON.stringify({ generatedAt: new Date().toISOString(), files, translations }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}
