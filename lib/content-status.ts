import { readJsonFile, writeJsonFile } from './jsonStore'
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
  return readJsonFile<Record<string, ContentStatus>>(dataFile, {})
}

function writeAll(data: Record<string, ContentStatus>): void {
  writeJsonFile(dataFile, data)
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
