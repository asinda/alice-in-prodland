import fs from 'fs'
import path from 'path'

const dataFile = path.join(process.cwd(), 'data', 'content-status.json')

export type ReviewStatus = 'unreviewed' | 'ready' | 'scheduled' | 'distributed'

export interface ContentStatus {
  status: ReviewStatus
  reviewedAt?: string
  aiImprovedTitle?: string
  aiImprovedExcerpt?: string
  aiSuggestions?: string[]
  aiAddedTags?: string[]
}

function readAll(): Record<string, ContentStatus> {
  if (!fs.existsSync(dataFile)) return {}
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, ContentStatus>): void {
  const tmp = dataFile + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, dataFile)
}

export function getContentStatus(slug: string): ContentStatus {
  return readAll()[slug] ?? { status: 'unreviewed' }
}

export function setContentStatus(slug: string, update: Partial<ContentStatus>): void {
  const all = readAll()
  all[slug] = { ...getContentStatus(slug), ...update }
  writeAll(all)
}

export function getAllByStatus(status: ReviewStatus): Array<{ slug: string } & ContentStatus> {
  const all = readAll()
  return Object.entries(all)
    .filter(([, v]) => v.status === status)
    .map(([slug, v]) => ({ slug, ...v }))
}
