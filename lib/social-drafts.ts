import path from 'path'
import { readJsonFile, writeJsonFile } from './jsonStore'

export type DraftStatus = 'pending' | 'posted' | 'rejected' | 'failed'

export interface SocialDraft {
  id: string
  postId: string
  slug: string
  title: string
  excerpt: string
  url: string
  imageUrl: string
  /** Textes générés par l'IA, modifiables avant approbation */
  /** Teaser LinkedIn (absent des anciens brouillons : modèle simple utilisé) */
  linkedinTeaser?: string
  instagramCaption: string
  youtubePost: string
  status: DraftStatus
  createdAt: string
  decidedAt?: string
  error?: string
}

const file = () => path.join(process.cwd(), 'data', 'social-drafts.json')

function cuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function readAll(): SocialDraft[] {
  return readJsonFile<SocialDraft[]>(file(), [])
}

export function listDrafts(): SocialDraft[] {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function getDraft(id: string): SocialDraft | null {
  return readAll().find(d => d.id === id) ?? null
}

/** Brouillon en attente (ou en échec, donc relançable) pour un post : évite les doublons. */
export function getOpenDraftForPost(postId: string): SocialDraft | null {
  return readAll().find(d => d.postId === postId && (d.status === 'pending' || d.status === 'failed')) ?? null
}

export function createDraft(input: Omit<SocialDraft, 'id' | 'status' | 'createdAt'>): SocialDraft {
  const all = readAll()
  const draft: SocialDraft = { ...input, id: cuid(), status: 'pending', createdAt: new Date().toISOString() }
  all.push(draft)
  writeJsonFile(file(), all)
  return draft
}

export function updateDraft(id: string, patch: Partial<Omit<SocialDraft, 'id'>>): SocialDraft | null {
  const all = readAll()
  const idx = all.findIndex(d => d.id === id)
  if (idx === -1) return null
  all[idx] = { ...all[idx], ...patch }
  writeJsonFile(file(), all)
  return all[idx]
}
