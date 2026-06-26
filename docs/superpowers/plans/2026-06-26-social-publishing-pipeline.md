# Social Publishing Pipeline — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pipeline complet de publication 3x/semaine avec review queue IA, scheduler GitHub Actions, et distribution sociale agentic sur LinkedIn, Instagram, YouTube, TikTok.

**Architecture:** Un module de statut de contenu (`content-status.ts`) et un scheduler (`schedule.ts`) forment le backbone du pipeline. Un agent Claude génère le contenu social en un appel, Satori génère les images, et les intégrations plateforme publient en parallèle. Le webhook `/api/schedule/publish` est déclenché par GitHub Actions cron.

**Tech Stack:** Next.js 16.2, React 19, TypeScript 5, @anthropic-ai/sdk, satori + @resvg/resvg-js, vitest, Meta Graph API, YouTube Data API v3.

## Global Constraints

- `@/*` alias pointe vers la racine du projet
- Modèles Claude : `claude-haiku-4-5-20251001` pour improve, `claude-sonnet-4-6` pour social
- Toutes les intégrations retournent `IntegrationResult` de `lib/db.ts`
- Les server actions utilisent `useActionState()` (React 19) et appellent `revalidatePath()` après toute mutation
- `PUBLISH_SECRET` comparé en constant-time (`timingSafeEqual` de `node:crypto`)
- Tous les tests mockent les appels réseau — zéro appel réel en test
- TDD : écrire le test avant le code pour chaque module

---

## Structure des fichiers

**Créer :**
```
vitest.config.ts
data/schedule.json
data/content-status.json
lib/content-status.ts
lib/schedule.ts
lib/social-image.ts
lib/agents/improve.ts
lib/agents/social.ts
lib/agents/distribute.ts
lib/integrations/instagram.ts
lib/integrations/youtube.ts
lib/actions/review.ts
lib/actions/schedule.ts
lib/__tests__/content-status.test.ts
lib/__tests__/schedule.test.ts
lib/__tests__/improve-agent.test.ts
lib/__tests__/social-agent.test.ts
lib/__tests__/instagram.test.ts
lib/__tests__/youtube.test.ts
lib/__tests__/linkedin.test.ts
lib/__tests__/publish-route.test.ts
app/api/schedule/publish/route.ts
app/api/og/[slug]/route.ts
app/admin/review/page.tsx
app/admin/review/ReviewClient.tsx
app/admin/schedule/page.tsx
app/admin/schedule/ScheduleClient.tsx
.github/workflows/publish.yml
```

**Modifier :**
```
lib/db.ts                    — ajouter instagram + youtube à Integrations
lib/actions/posts.ts         — remplacer pushIntegrations par generateAndDistribute
app/admin/layout.tsx         — ajouter liens Review + Schedule dans la nav
package.json                 — deps + scripts test
```

---

## Task 1 : Setup — Vitest + dépendances

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `data/schedule.json`
- Create: `data/content-status.json`

**Interfaces:**
- Produit: commande `npm test` fonctionnelle

- [ ] **Step 1 : Installer les dépendances**

```bash
cd c:/Users/ASINDAYIGAYA/Documents/projet/alice-in-prodland
npm install @anthropic-ai/sdk satori @resvg/resvg-js
npm install -D vitest @vitest/coverage-v8
```

Résultat attendu : no errors, `node_modules/@anthropic-ai/sdk` existe.

- [ ] **Step 2 : Créer vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

- [ ] **Step 3 : Ajouter les scripts dans package.json**

Dans la section `"scripts"`, ajouter après `"lint"` :

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4 : Initialiser les fichiers de données**

```bash
echo "[]" > data/schedule.json
echo "{}" > data/content-status.json
```

- [ ] **Step 5 : Vérifier que vitest démarre**

```bash
npm test
```

Résultat attendu : `No test files found` (pas d'erreur de config).

- [ ] **Step 6 : Commit**

```bash
git add vitest.config.ts package.json package-lock.json data/schedule.json data/content-status.json
git commit -m "chore: add vitest, anthropic sdk, satori deps + init data files"
```

---

## Task 2 : Étendre Integrations dans lib/db.ts

**Files:**
- Modify: `lib/db.ts:20-30` — Integrations interface + defaultIntegrations

**Interfaces:**
- Produit: `Integrations.instagram` et `Integrations.youtube` disponibles pour toutes les tâches suivantes

- [ ] **Step 1 : Modifier l'interface Integrations dans lib/db.ts**

Remplacer :
```typescript
export interface Integrations {
  linkedin: IntegrationResult;
  gumroad: IntegrationResult;
  tiktok: IntegrationResult;
}

const defaultIntegrations = (): Integrations => ({
  linkedin: { status: 'idle' },
  gumroad: { status: 'idle' },
  tiktok: { status: 'idle' },
});
```

Par :
```typescript
export interface Integrations {
  linkedin: IntegrationResult;
  gumroad: IntegrationResult;
  tiktok: IntegrationResult;
  instagram: IntegrationResult;
  youtube: IntegrationResult;
}

const defaultIntegrations = (): Integrations => ({
  linkedin: { status: 'idle' },
  gumroad: { status: 'idle' },
  tiktok: { status: 'idle' },
  instagram: { status: 'idle' },
  youtube: { status: 'idle' },
});
```

- [ ] **Step 2 : Vérifier qu'il n'y a pas d'erreur TypeScript**

```bash
npx tsc --noEmit
```

Résultat attendu : no errors (les builds errors sont supprimés mais tsc direct les montre).

- [ ] **Step 3 : Commit**

```bash
git add lib/db.ts
git commit -m "feat: add instagram + youtube to Integrations type"
```

---

## Task 3 : lib/content-status.ts (TDD)

**Files:**
- Create: `lib/content-status.ts`
- Create: `lib/__tests__/content-status.test.ts`

**Interfaces:**
- Produit:
  ```typescript
  type ReviewStatus = 'unreviewed' | 'ready' | 'scheduled' | 'distributed'
  interface ContentStatus { status: ReviewStatus; reviewedAt?: string; aiImprovedTitle?: string; aiImprovedExcerpt?: string; aiSuggestions?: string[]; aiAddedTags?: string[] }
  function getContentStatus(slug: string): ContentStatus
  function setContentStatus(slug: string, update: Partial<ContentStatus>): void
  function getAllByStatus(status: ReviewStatus): Array<{ slug: string } & ContentStatus>
  ```

- [ ] **Step 1 : Écrire les tests**

```typescript
// lib/__tests__/content-status.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

const dataFile = path.join(process.cwd(), 'data', 'content-status.json')
const backup = path.join(process.cwd(), 'data', 'content-status.backup.json')

beforeEach(() => {
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backup)
  fs.writeFileSync(dataFile, '{}')
})

afterEach(() => {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, dataFile)
    fs.unlinkSync(backup)
  }
})

describe('getContentStatus', () => {
  it('retourne unreviewed pour un slug inconnu', async () => {
    const { getContentStatus } = await import('../content-status')
    const status = getContentStatus('slug-inconnu')
    expect(status.status).toBe('unreviewed')
  })

  it('retourne le statut sauvegardé', async () => {
    const { getContentStatus, setContentStatus } = await import('../content-status')
    setContentStatus('mon-post', { status: 'ready', reviewedAt: '2026-06-26T09:00:00Z' })
    expect(getContentStatus('mon-post').status).toBe('ready')
    expect(getContentStatus('mon-post').reviewedAt).toBe('2026-06-26T09:00:00Z')
  })
})

describe('setContentStatus', () => {
  it('fusionne les champs partiels sans écraser les autres', async () => {
    const { getContentStatus, setContentStatus } = await import('../content-status')
    setContentStatus('post-a', { status: 'ready', aiImprovedTitle: 'Titre amélioré' })
    setContentStatus('post-a', { status: 'scheduled' })
    expect(getContentStatus('post-a').aiImprovedTitle).toBe('Titre amélioré')
    expect(getContentStatus('post-a').status).toBe('scheduled')
  })
})

describe('getAllByStatus', () => {
  it('retourne uniquement les posts du statut demandé', async () => {
    const { setContentStatus, getAllByStatus } = await import('../content-status')
    setContentStatus('post-1', { status: 'ready' })
    setContentStatus('post-2', { status: 'scheduled' })
    setContentStatus('post-3', { status: 'ready' })
    const ready = getAllByStatus('ready')
    expect(ready).toHaveLength(2)
    expect(ready.map(r => r.slug)).toContain('post-1')
    expect(ready.map(r => r.slug)).toContain('post-3')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- content-status
```

Résultat attendu : FAIL — module not found.

- [ ] **Step 3 : Implémenter lib/content-status.ts**

```typescript
// lib/content-status.ts
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
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
}

function writeAll(data: Record<string, ContentStatus>): void {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2))
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
```

- [ ] **Step 4 : Lancer les tests**

```bash
npm test -- content-status
```

Résultat attendu : 4 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/content-status.ts lib/__tests__/content-status.test.ts
git commit -m "feat: add content-status module with TDD"
```

---

## Task 4 : lib/schedule.ts (TDD)

**Files:**
- Create: `lib/schedule.ts`
- Create: `lib/__tests__/schedule.test.ts`

**Interfaces:**
- Produit:
  ```typescript
  interface ScheduleEntry { id: string; slug: string; source: 'fs' | 'db'; scheduledAt: string; status: 'pending' | 'published' | 'failed'; publishedAt?: string; error?: string }
  function getSchedule(): ScheduleEntry[]
  function addToSchedule(slug: string, source: 'fs' | 'db', scheduledAt: string): ScheduleEntry
  function removeFromSchedule(id: string): void
  function getNextPending(now?: Date): ScheduleEntry | null
  function markPublished(id: string): void
  function markFailed(id: string, error: string): void
  ```

- [ ] **Step 1 : Écrire les tests**

```typescript
// lib/__tests__/schedule.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

const dataFile = path.join(process.cwd(), 'data', 'schedule.json')
const backup = path.join(process.cwd(), 'data', 'schedule.backup.json')

beforeEach(() => {
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backup)
  fs.writeFileSync(dataFile, '[]')
})

afterEach(() => {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, dataFile)
    fs.unlinkSync(backup)
  }
})

describe('addToSchedule', () => {
  it('ajoute une entrée pending avec un id', async () => {
    const { addToSchedule, getSchedule } = await import('../schedule')
    const entry = addToSchedule('mon-post', 'fs', '2026-06-30T09:00:00Z')
    expect(entry.id).toBeTruthy()
    expect(entry.status).toBe('pending')
    expect(getSchedule()).toHaveLength(1)
  })
})

describe('getNextPending', () => {
  it('retourne le premier pending dont scheduledAt est dépassé', async () => {
    const { addToSchedule, getNextPending } = await import('../schedule')
    addToSchedule('post-passe', 'db', '2026-01-01T09:00:00Z')
    addToSchedule('post-futur', 'db', '2099-01-01T09:00:00Z')
    const next = getNextPending(new Date('2026-06-26T10:00:00Z'))
    expect(next?.slug).toBe('post-passe')
  })

  it('retourne null si aucun pending échu', async () => {
    const { addToSchedule, getNextPending } = await import('../schedule')
    addToSchedule('post-futur', 'db', '2099-01-01T09:00:00Z')
    expect(getNextPending(new Date())).toBeNull()
  })

  it('ignore les entrées published', async () => {
    const { addToSchedule, markPublished, getNextPending } = await import('../schedule')
    const entry = addToSchedule('post-pub', 'db', '2026-01-01T09:00:00Z')
    markPublished(entry.id)
    expect(getNextPending(new Date())).toBeNull()
  })
})

describe('markFailed', () => {
  it('stocke le message d\'erreur', async () => {
    const { addToSchedule, markFailed, getSchedule } = await import('../schedule')
    const entry = addToSchedule('post-err', 'db', '2026-01-01T09:00:00Z')
    markFailed(entry.id, 'Timeout')
    const updated = getSchedule().find(e => e.id === entry.id)
    expect(updated?.status).toBe('failed')
    expect(updated?.error).toBe('Timeout')
  })
})

describe('removeFromSchedule', () => {
  it('supprime l\'entrée par id', async () => {
    const { addToSchedule, removeFromSchedule, getSchedule } = await import('../schedule')
    const entry = addToSchedule('post-del', 'db', '2026-06-30T09:00:00Z')
    removeFromSchedule(entry.id)
    expect(getSchedule()).toHaveLength(0)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- schedule.test
```

Résultat attendu : FAIL — module not found.

- [ ] **Step 3 : Implémenter lib/schedule.ts**

```typescript
// lib/schedule.ts
import fs from 'fs'
import path from 'path'

const dataFile = path.join(process.cwd(), 'data', 'schedule.json')

export interface ScheduleEntry {
  id: string
  slug: string
  source: 'fs' | 'db'
  scheduledAt: string
  status: 'pending' | 'published' | 'failed'
  publishedAt?: string
  error?: string
}

function cuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function readAll(): ScheduleEntry[] {
  if (!fs.existsSync(dataFile)) return []
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'))
}

function writeAll(data: ScheduleEntry[]): void {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2))
}

export function getSchedule(): ScheduleEntry[] {
  return readAll()
}

export function addToSchedule(slug: string, source: 'fs' | 'db', scheduledAt: string): ScheduleEntry {
  const entries = readAll()
  const entry: ScheduleEntry = { id: cuid(), slug, source, scheduledAt, status: 'pending' }
  entries.push(entry)
  writeAll(entries)
  return entry
}

export function removeFromSchedule(id: string): void {
  writeAll(readAll().filter(e => e.id !== id))
}

export function getNextPending(now: Date = new Date()): ScheduleEntry | null {
  const entries = readAll()
    .filter(e => e.status === 'pending' && new Date(e.scheduledAt) <= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  return entries[0] ?? null
}

export function markPublished(id: string): void {
  const entries = readAll()
  const idx = entries.findIndex(e => e.id === id)
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], status: 'published', publishedAt: new Date().toISOString() }
    writeAll(entries)
  }
}

export function markFailed(id: string, error: string): void {
  const entries = readAll()
  const idx = entries.findIndex(e => e.id === id)
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], status: 'failed', error }
    writeAll(entries)
  }
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
npm test -- schedule.test
```

Résultat attendu : 6 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/schedule.ts lib/__tests__/schedule.test.ts
git commit -m "feat: add schedule module with TDD"
```

---

## Task 5 : lib/agents/improve.ts (TDD)

**Files:**
- Create: `lib/agents/improve.ts`
- Create: `lib/__tests__/improve-agent.test.ts`

**Interfaces:**
- Consomme: `@anthropic-ai/sdk`
- Produit:
  ```typescript
  interface ImproveOutput { improvedTitle: string; improvedExcerpt: string; suggestions: string[]; addedTags: string[] }
  async function improvePost(post: { slug: string; title: string; excerpt: string; content: string; tags: string[] }): Promise<ImproveOutput>
  ```

- [ ] **Step 1 : Écrire les tests**

```typescript
// lib/__tests__/improve-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockOutput: import('../agents/improve').ImproveOutput = {
  improvedTitle: 'Kubectl en production : le cheatsheet complet 2026',
  improvedExcerpt: 'Toutes les commandes kubectl essentielles pour le quotidien SRE.',
  suggestions: ['Ajouter section kubectl debug', 'Mettre à jour les exemples k8s 1.31', 'Ajouter liens vers la doc officielle'],
  addedTags: ['kubectl', 'cheatsheet'],
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: 'tool_use',
          name: 'improve_content',
          input: mockOutput,
        }],
      }),
    },
  })),
}))

describe('improvePost', () => {
  beforeEach(() => { vi.resetModules() })

  it('retourne les 4 champs requis', async () => {
    const { improvePost } = await import('../agents/improve')
    const result = await improvePost({
      slug: 'kubectl-cheatsheet',
      title: 'Kubectl cheatsheet',
      excerpt: 'Les commandes kubectl.',
      content: '# Kubectl\n\nCommandes de base...',
      tags: ['kubernetes'],
    })
    expect(result).toHaveProperty('improvedTitle')
    expect(result).toHaveProperty('improvedExcerpt')
    expect(result).toHaveProperty('suggestions')
    expect(result).toHaveProperty('addedTags')
  })

  it('suggestions contient exactement 3 éléments', async () => {
    const { improvePost } = await import('../agents/improve')
    const result = await improvePost({
      slug: 'test', title: 'Test', excerpt: 'Test.', content: 'Contenu.', tags: [],
    })
    expect(result.suggestions).toHaveLength(3)
  })

  it('lève une erreur si Claude ne retourne pas de tool_use', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    vi.mocked(Anthropic).mockImplementationOnce(() => ({
      messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'oops' }] }) },
    }) as never)
    vi.resetModules()
    const { improvePost } = await import('../agents/improve')
    await expect(improvePost({ slug: 's', title: 't', excerpt: 'e', content: 'c', tags: [] }))
      .rejects.toThrow('No tool use in response')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- improve-agent
```

Résultat attendu : FAIL.

- [ ] **Step 3 : Créer lib/agents/improve.ts**

```typescript
// lib/agents/improve.ts
import Anthropic from '@anthropic-ai/sdk'

export interface ImproveOutput {
  improvedTitle: string
  improvedExcerpt: string
  suggestions: string[]
  addedTags: string[]
}

export async function improvePost(post: {
  slug: string
  title: string
  excerpt: string
  content: string
  tags: string[]
}): Promise<ImproveOutput> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [{
      name: 'improve_content',
      description: 'Retourne le contenu amélioré pour le SEO',
      input_schema: {
        type: 'object' as const,
        properties: {
          improvedTitle: { type: 'string', description: 'Titre optimisé SEO, max 70 chars' },
          improvedExcerpt: { type: 'string', description: 'Excerpt accrocheur, max 150 chars' },
          suggestions: { type: 'array', items: { type: 'string' }, description: 'Exactement 3 suggestions de mise à jour du contenu' },
          addedTags: { type: 'array', items: { type: 'string' }, description: 'Tags manquants à ajouter' },
        },
        required: ['improvedTitle', 'improvedExcerpt', 'suggestions', 'addedTags'],
      },
    }],
    tool_choice: { type: 'tool', name: 'improve_content' },
    messages: [{
      role: 'user',
      content: `Tu es un expert SEO pour un blog SRE/DevOps francophone (alice-in-prodland). Améliore ce contenu.

Titre: ${post.title}
Excerpt: ${post.excerpt}
Tags: ${post.tags.join(', ')}

Contenu (extrait):
${post.content.slice(0, 3000)}`,
    }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response')
  return toolUse.input as ImproveOutput
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
npm test -- improve-agent
```

Résultat attendu : 3 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/agents/improve.ts lib/__tests__/improve-agent.test.ts
git commit -m "feat: add improve agent (Claude Haiku) with TDD"
```

---

## Task 6 : lib/social-image.ts + /api/og/[slug]

**Files:**
- Create: `lib/social-image.ts`
- Create: `app/api/og/[slug]/route.ts`

**Interfaces:**
- Produit:
  ```typescript
  async function generateSocialImage(post: { title: string; tags: string[] }): Promise<Buffer>
  function saveSocialImage(slug: string, buffer: Buffer): string   // retourne le path relatif
  ```

- [ ] **Step 1 : Créer lib/social-image.ts**

```typescript
// lib/social-image.ts
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import fs from 'fs'
import path from 'path'

export async function generateSocialImage(post: {
  title: string
  tags: string[]
}): Promise<Buffer> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          backgroundColor: '#0f172a',
          padding: '60px',
          justifyContent: 'space-between',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { color: '#94a3b8', fontSize: '22px', fontFamily: 'monospace' },
              children: '$ alice-in-prodland',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                color: '#f1f5f9',
                fontSize: post.title.length > 60 ? '44px' : '52px',
                fontWeight: 'bold',
                lineHeight: '1.25',
                fontFamily: 'monospace',
              },
              children: post.title,
            },
          },
          {
            type: 'div',
            props: {
              style: { color: '#64748b', fontSize: '20px', fontFamily: 'monospace' },
              children: post.tags.slice(0, 4).map(t => `#${t}`).join('  '),
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts: [] }
  )

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
  return Buffer.from(resvg.render().asPng())
}

export function saveSocialImage(slug: string, buffer: Buffer): string {
  const dir = path.join(process.cwd(), 'public', 'social')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${slug}.png`), buffer)
  return `/social/${slug}.png`
}
```

- [ ] **Step 2 : Créer app/api/og/[slug]/route.ts**

```typescript
// app/api/og/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPost } from '@/lib/posts'
import { generateSocialImage } from '@/lib/social-image'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const post = await getPost(slug)
    const buffer = await generateSocialImage({ title: post.title, tags: post.tags })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
```

- [ ] **Step 3 : Tester manuellement**

```bash
npm run dev
```

Ouvrir `http://localhost:3000/api/og/kubectl-cheatsheet-prod` — doit afficher une image PNG.

- [ ] **Step 4 : Commit**

```bash
git add lib/social-image.ts app/api/og/
git commit -m "feat: add Satori social image generator + /api/og/[slug] endpoint"
```

---

## Task 7 : lib/integrations/instagram.ts (TDD)

**Files:**
- Create: `lib/integrations/instagram.ts`
- Create: `lib/__tests__/instagram.test.ts`

**Interfaces:**
- Produit:
  ```typescript
  async function postToInstagram(payload: { imageUrl: string; caption: string }): Promise<IntegrationResult>
  ```

- [ ] **Step 1 : Écrire les tests**

```typescript
// lib/__tests__/instagram.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('postToInstagram', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('retourne skipped si les credentials manquent', async () => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN
    delete process.env.INSTAGRAM_ACCOUNT_ID
    const { postToInstagram } = await import('../integrations/instagram')
    const result = await postToInstagram({ imageUrl: 'https://example.com/img.png', caption: 'Test' })
    expect(result.status).toBe('skipped')
  })

  it('publie en 2 étapes et retourne success avec id', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'token123'
    process.env.INSTAGRAM_ACCOUNT_ID = 'account123'
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'container_abc' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'post_xyz' }) } as Response)
    const { postToInstagram } = await import('../integrations/instagram')
    const result = await postToInstagram({ imageUrl: 'https://example.com/img.png', caption: 'Hello #devops' })
    expect(result.status).toBe('success')
    expect(result.id).toBe('post_xyz')
  })

  it('retourne error si la création du container échoue', async () => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'token'
    process.env.INSTAGRAM_ACCOUNT_ID = 'acct'
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'Bad request' } as Response)
    const { postToInstagram } = await import('../integrations/instagram')
    const result = await postToInstagram({ imageUrl: 'https://x.com/img.png', caption: 'Test' })
    expect(result.status).toBe('error')
    expect(result.error).toContain('400')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- instagram
```

Résultat attendu : FAIL.

- [ ] **Step 3 : Implémenter lib/integrations/instagram.ts**

```typescript
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
```

- [ ] **Step 4 : Lancer les tests**

```bash
npm test -- instagram
```

Résultat attendu : 3 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/integrations/instagram.ts lib/__tests__/instagram.test.ts
git commit -m "feat: add Instagram integration with TDD"
```

---

## Task 8 : lib/integrations/youtube.ts (TDD)

**Files:**
- Create: `lib/integrations/youtube.ts`
- Create: `lib/__tests__/youtube.test.ts`

**Interfaces:**
- Produit:
  ```typescript
  async function postYoutubeCommunity(payload: { text: string }): Promise<IntegrationResult>
  ```

- [ ] **Step 1 : Écrire les tests**

```typescript
// lib/__tests__/youtube.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('postYoutubeCommunity', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('retourne skipped si les credentials manquent', async () => {
    delete process.env.YOUTUBE_API_KEY
    delete process.env.YOUTUBE_CHANNEL_ID
    const { postYoutubeCommunity } = await import('../integrations/youtube')
    const result = await postYoutubeCommunity({ text: 'Hello YouTube !' })
    expect(result.status).toBe('skipped')
  })

  it('retourne success avec id et url si l\'API répond OK', async () => {
    process.env.YOUTUBE_API_KEY = 'apikey123'
    process.env.YOUTUBE_CHANNEL_ID = 'channel123'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yt_post_abc' }),
    } as Response)
    const { postYoutubeCommunity } = await import('../integrations/youtube')
    const result = await postYoutubeCommunity({ text: 'Nouveau post SRE disponible !' })
    expect(result.status).toBe('success')
    expect(result.id).toBe('yt_post_abc')
    expect(result.url).toContain('yt_post_abc')
  })

  it('retourne error si l\'API renvoie une erreur HTTP', async () => {
    process.env.YOUTUBE_API_KEY = 'key'
    process.env.YOUTUBE_CHANNEL_ID = 'chan'
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'Forbidden' } as Response)
    const { postYoutubeCommunity } = await import('../integrations/youtube')
    const result = await postYoutubeCommunity({ text: 'Test' })
    expect(result.status).toBe('error')
    expect(result.error).toContain('403')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- youtube
```

- [ ] **Step 3 : Implémenter lib/integrations/youtube.ts**

```typescript
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
```

- [ ] **Step 4 : Lancer les tests**

```bash
npm test -- youtube
```

Résultat attendu : 3 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/integrations/youtube.ts lib/__tests__/youtube.test.ts
git commit -m "feat: add YouTube Community Post integration with TDD"
```

---

## Task 9 : lib/agents/social.ts (TDD)

**Files:**
- Create: `lib/agents/social.ts`
- Create: `lib/__tests__/social-agent.test.ts`

**Interfaces:**
- Produit:
  ```typescript
  interface SocialDistributionOutput {
    linkedin: { text: string; articleUrl: string }
    instagram: { caption: string; imagePrompt: string }
    youtube: { communityPost: string }
    tiktok: { caption: string; script: string }
  }
  async function generateSocialContent(post: { title: string; excerpt: string; content: string; tags: string[]; url: string; type: string }): Promise<SocialDistributionOutput>
  ```

- [ ] **Step 1 : Écrire les tests**

```typescript
// lib/__tests__/social-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSocialOutput = {
  linkedin: { text: 'Post LinkedIn sur Kubernetes...', articleUrl: 'https://alice-in-prodland.com/blog/test' },
  instagram: { caption: 'Caption Instagram #devops', imagePrompt: 'Dark background tech card' },
  youtube: { communityPost: 'Nouveau post sur Kubernetes disponible ! Vous utilisez quoi comme outil de debug ?' },
  tiktok: { caption: 'Debug Kubernetes OOM en 60s 🔥', script: '1. Reproduire le problème\n2. kubectl describe pod\n3. Lire les logs' },
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'tool_use', name: 'generate_social_content', input: mockSocialOutput }],
      }),
    },
  })),
}))

describe('generateSocialContent', () => {
  beforeEach(() => { vi.resetModules() })

  it('retourne les 4 plateformes', async () => {
    const { generateSocialContent } = await import('../agents/social')
    const result = await generateSocialContent({
      title: 'Debug OOM Kubernetes', excerpt: 'Comment déboguer.', content: '# Debug\n\nContenu.', tags: ['kubernetes'], url: 'https://alice-in-prodland.com/blog/test', type: 'post',
    })
    expect(result).toHaveProperty('linkedin')
    expect(result).toHaveProperty('instagram')
    expect(result).toHaveProperty('youtube')
    expect(result).toHaveProperty('tiktok')
  })

  it('le texte LinkedIn ne dépasse pas 1500 chars', async () => {
    const { generateSocialContent } = await import('../agents/social')
    const result = await generateSocialContent({
      title: 'Test', excerpt: 'Test.', content: 'c', tags: [], url: 'https://x.com/blog/test', type: 'post',
    })
    expect(result.linkedin.text.length).toBeLessThanOrEqual(1500)
  })

  it('la caption TikTok ne dépasse pas 100 chars', async () => {
    const { generateSocialContent } = await import('../agents/social')
    const result = await generateSocialContent({
      title: 'Test', excerpt: 'Test.', content: 'c', tags: [], url: 'https://x.com/blog/test', type: 'post',
    })
    expect(result.tiktok.caption.length).toBeLessThanOrEqual(100)
  })

  it('articleUrl est l\'url du post', async () => {
    const { generateSocialContent } = await import('../agents/social')
    const result = await generateSocialContent({
      title: 'Test', excerpt: 'T.', content: 'c', tags: [], url: 'https://x.com/blog/mon-post', type: 'post',
    })
    expect(result.linkedin.articleUrl).toBe('https://x.com/blog/mon-post')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- social-agent
```

- [ ] **Step 3 : Implémenter lib/agents/social.ts**

```typescript
// lib/agents/social.ts
import Anthropic from '@anthropic-ai/sdk'

export interface SocialDistributionOutput {
  linkedin: { text: string; articleUrl: string }
  instagram: { caption: string; imagePrompt: string }
  youtube: { communityPost: string }
  tiktok: { caption: string; script: string }
}

export async function generateSocialContent(post: {
  title: string
  excerpt: string
  content: string
  tags: string[]
  url: string
  type: string
}): Promise<SocialDistributionOutput> {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [{
      name: 'generate_social_content',
      description: 'Génère le contenu social adapté à chaque plateforme',
      input_schema: {
        type: 'object' as const,
        properties: {
          linkedin: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Texte LinkedIn, 1200-1500 chars max, ton professionnel, 5 hashtags max' },
              articleUrl: { type: 'string', description: 'URL de l\'article' },
            },
            required: ['text', 'articleUrl'],
          },
          instagram: {
            type: 'object',
            properties: {
              caption: { type: 'string', description: 'Caption Instagram, 150-200 chars, accessible, 8 hashtags max' },
              imagePrompt: { type: 'string', description: 'Description du visuel pour la carte sociale' },
            },
            required: ['caption', 'imagePrompt'],
          },
          youtube: {
            type: 'object',
            properties: {
              communityPost: { type: 'string', description: 'Community post YouTube, 300-500 chars, question ouverte + lien' },
            },
            required: ['communityPost'],
          },
          tiktok: {
            type: 'object',
            properties: {
              caption: { type: 'string', description: 'Caption TikTok, 80-100 chars max, accrocheur' },
              script: { type: 'string', description: '5-7 bullet points pour un short de 60s' },
            },
            required: ['caption', 'script'],
          },
        },
        required: ['linkedin', 'instagram', 'youtube', 'tiktok'],
      },
    }],
    tool_choice: { type: 'tool', name: 'generate_social_content' },
    messages: [{
      role: 'user',
      content: `Tu es Alice Sindayigaya, DevOps Architect / SRE chez Cegedim. Génère du contenu social pour ce post de blog SRE/DevOps en français.

Titre: ${post.title}
Excerpt: ${post.excerpt}
URL: ${post.url}
Tags: ${post.tags.join(', ')}
Type: ${post.type}

Contenu (extrait):
${post.content.slice(0, 2000)}

Adapte le ton à chaque plateforme. Contenu en français uniquement.`,
    }],
  })

  const toolUse = response.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response')
  const output = toolUse.input as SocialDistributionOutput
  output.linkedin.articleUrl = post.url
  return output
}
```

- [ ] **Step 4 : Lancer les tests**

```bash
npm test -- social-agent
```

Résultat attendu : 4 tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/agents/social.ts lib/__tests__/social-agent.test.ts
git commit -m "feat: add social distribution agent (Claude Sonnet) with TDD"
```

---

## Task 10 : lib/agents/distribute.ts + mise à jour lib/actions/posts.ts

**Files:**
- Create: `lib/agents/distribute.ts`
- Modify: `lib/actions/posts.ts`

**Interfaces:**
- Consomme: `generateSocialContent`, `generateSocialImage`, `saveSocialImage`, `postToLinkedIn`, `postToInstagram`, `postYoutubeCommunity`, `prepareTikTokPost`, `updatePost`, `DbPost`
- Produit:
  ```typescript
  async function generateAndDistribute(post: DbPost): Promise<void>
  ```

- [ ] **Step 1 : Créer lib/agents/distribute.ts**

```typescript
// lib/agents/distribute.ts
import { generateSocialContent } from './social'
import { generateSocialImage, saveSocialImage } from '../social-image'
import { postToLinkedIn } from '../integrations/linkedin'
import { postToInstagram } from '../integrations/instagram'
import { postYoutubeCommunity } from '../integrations/youtube'
import { prepareTikTokPost } from '../integrations/tiktok'
import { updatePost, type DbPost } from '../db'

export async function generateAndDistribute(post: DbPost): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = `${siteUrl}/blog/${post.slug}`

  const [imageBuffer, socialContent] = await Promise.all([
    generateSocialImage({ title: post.title, tags: post.tags }),
    generateSocialContent({ title: post.title, excerpt: post.excerpt, content: post.content, tags: post.tags, url, type: post.type }),
  ])

  const imagePath = saveSocialImage(post.slug, imageBuffer)
  const imageUrl = `${siteUrl}${imagePath}`

  const [linkedin, instagram, youtube, tiktok] = await Promise.all([
    postToLinkedIn({ title: post.title, excerpt: post.excerpt, url, tags: post.tags }),
    postToInstagram({ imageUrl, caption: socialContent.instagram.caption }),
    postYoutubeCommunity({ text: socialContent.youtube.communityPost }),
    prepareTikTokPost({ title: post.title, excerpt: post.excerpt, url, tags: post.tags, type: post.type }),
  ])

  updatePost(post.id, { integrations: { ...post.integrations, linkedin, instagram, youtube, tiktok } })
}
```

- [ ] **Step 2 : Mettre à jour lib/actions/posts.ts**

Remplacer la fonction `pushIntegrations` et son import par `generateAndDistribute` :

```typescript
// lib/actions/posts.ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createPost, updatePost, deletePost, publishPost, unpublishPost, getPostById, getPostBySlug,
  type ContentType,
} from '../db';
import { getFsPostRaw } from '../posts';
import { generateAndDistribute } from '../agents/distribute';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function actionCreatePost(_: unknown, formData: FormData) {
  const title = (formData.get('title') as string).trim();
  const excerpt = (formData.get('excerpt') as string).trim();
  const content = (formData.get('content') as string).trim();
  const type = (formData.get('type') as ContentType) ?? 'post';
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return { error: 'Le titre est requis.' };

  const post = createPost({ slug: slugify(title), title, excerpt, content, type, tags, status: 'draft', publishedAt: null });

  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}

export async function actionUpdatePost(_: unknown, formData: FormData) {
  const id = formData.get('id') as string;
  const title = (formData.get('title') as string).trim();
  const excerpt = (formData.get('excerpt') as string).trim();
  const content = (formData.get('content') as string).trim();
  const type = (formData.get('type') as ContentType) ?? 'post';
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return { error: 'Le titre est requis.' };
  updatePost(id, { title, excerpt, content, type, tags });
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  return { success: true };
}

export async function actionPublishPost(id: string) {
  const post = getPostById(id);
  if (!post) return;
  publishPost(id);
  const published = getPostById(id)!;
  await generateAndDistribute(published);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath('/blog');
  revalidatePath('/');
}

export async function actionRepushPostIntegrations(id: string) {
  const post = getPostById(id);
  if (!post || post.status !== 'published') return;
  await generateAndDistribute(post);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
}

export async function actionUnpublishPost(id: string) {
  unpublishPost(id);
  revalidatePath('/admin/posts');
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath('/blog');
}

export async function actionDeletePost(id: string) {
  deletePost(id);
  revalidatePath('/admin/posts');
  redirect('/admin/posts');
}

export async function actionImportFsPost(slug: string) {
  const existing = getPostBySlug(slug);
  if (existing) { redirect(`/admin/posts/${existing.id}`); return; }

  const raw = getFsPostRaw(slug);
  if (!raw) throw new Error(`Fichier posts/${slug}.md introuvable`);

  const post = createPost({ slug, title: raw.title, excerpt: raw.excerpt, content: raw.content, tags: raw.tags, type: 'post', status: 'published', publishedAt: raw.date });

  revalidatePath('/admin/posts');
  redirect(`/admin/posts/${post.id}`);
}
```

- [ ] **Step 3 : Lancer les tests pour s'assurer que rien n'est cassé**

```bash
npm test
```

Résultat attendu : tous les tests passent.

- [ ] **Step 4 : Commit**

```bash
git add lib/agents/distribute.ts lib/actions/posts.ts
git commit -m "feat: add distribute orchestrator, wire into actionPublishPost"
```

---

## Task 11 : POST /api/schedule/publish (TDD)

**Files:**
- Create: `app/api/schedule/publish/route.ts`
- Create: `lib/__tests__/publish-route.test.ts`

**Interfaces:**
- Consomme: `getNextPending`, `markPublished`, `markFailed`, `setContentStatus`, `getPostBySlug`, `publishPost`, `getFsPostRaw`, `createPost`, `generateAndDistribute`

- [ ] **Step 1 : Écrire les tests**

```typescript
// lib/__tests__/publish-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/schedule', () => ({
  getNextPending: vi.fn(),
  markPublished: vi.fn(),
  markFailed: vi.fn(),
}))
vi.mock('@/lib/content-status', () => ({ setContentStatus: vi.fn() }))
vi.mock('@/lib/db', () => ({
  getPostBySlug: vi.fn(),
  publishPost: vi.fn(),
  createPost: vi.fn(),
}))
vi.mock('@/lib/posts', () => ({ getFsPostRaw: vi.fn() }))
vi.mock('@/lib/agents/distribute', () => ({ generateAndDistribute: vi.fn() }))

function makeRequest(token: string) {
  return new NextRequest('http://localhost/api/schedule/publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

describe('POST /api/schedule/publish', () => {
  beforeEach(() => {
    process.env.PUBLISH_SECRET = 'secret-de-test-32-caracteres-min'
    vi.resetModules()
  })

  it('retourne 401 si le token est invalide', async () => {
    const { POST } = await import('../app/api/schedule/publish/route')
    const res = await POST(makeRequest('mauvais-token'))
    expect(res.status).toBe(401)
  })

  it('retourne no_pending si la queue est vide', async () => {
    const { getNextPending } = await import('@/lib/schedule')
    vi.mocked(getNextPending).mockReturnValue(null)
    const { POST } = await import('../app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    const body = await res.json()
    expect(body.status).toBe('no_pending')
  })

  it('publie un post DB existant et retourne published', async () => {
    const { getNextPending } = await import('@/lib/schedule')
    const { getPostBySlug } = await import('@/lib/db')
    const { generateAndDistribute } = await import('@/lib/agents/distribute')
    vi.mocked(getNextPending).mockReturnValue({
      id: 'sched1', slug: 'mon-post', source: 'db', scheduledAt: '2026-01-01T09:00:00Z', status: 'pending',
    })
    vi.mocked(getPostBySlug).mockReturnValue({
      id: 'post1', slug: 'mon-post', title: 'Mon post', excerpt: '', content: '', tags: [], type: 'post',
      status: 'draft', publishedAt: null, integrations: { linkedin: { status: 'idle' }, gumroad: { status: 'idle' }, tiktok: { status: 'idle' }, instagram: { status: 'idle' }, youtube: { status: 'idle' } },
      createdAt: '', updatedAt: '',
    })
    vi.mocked(generateAndDistribute).mockResolvedValue(undefined)
    const { POST } = await import('../app/api/schedule/publish/route')
    const res = await POST(makeRequest('secret-de-test-32-caracteres-min'))
    const body = await res.json()
    expect(body.status).toBe('published')
    expect(body.slug).toBe('mon-post')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

```bash
npm test -- publish-route
```

- [ ] **Step 3 : Implémenter app/api/schedule/publish/route.ts**

```typescript
// app/api/schedule/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { getNextPending, markPublished, markFailed } from '@/lib/schedule'
import { setContentStatus } from '@/lib/content-status'
import { getPostBySlug, publishPost, createPost } from '@/lib/db'
import { getFsPostRaw } from '@/lib/posts'
import { generateAndDistribute } from '@/lib/agents/distribute'

function verifyToken(req: NextRequest): boolean {
  const secret = process.env.PUBLISH_SECRET
  if (!secret) return false
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  if (!verifyToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const entry = getNextPending()
  if (!entry) return NextResponse.json({ status: 'no_pending' })

  try {
    let post = getPostBySlug(entry.slug)

    if (!post && entry.source === 'fs') {
      const raw = getFsPostRaw(entry.slug)
      if (!raw) throw new Error(`FS post introuvable : ${entry.slug}`)
      post = createPost({
        slug: entry.slug, title: raw.title, excerpt: raw.excerpt, content: raw.content,
        tags: raw.tags, type: 'post', status: 'draft', publishedAt: null,
      })
    }

    if (!post) throw new Error(`Post introuvable : ${entry.slug}`)

    publishPost(post.id)
    const published = getPostBySlug(entry.slug)!
    await generateAndDistribute(published)

    markPublished(entry.id)
    setContentStatus(entry.slug, { status: 'distributed' })

    return NextResponse.json({ status: 'published', slug: entry.slug })
  } catch (e) {
    markFailed(entry.id, String(e))
    return NextResponse.json({ status: 'error', error: String(e) }, { status: 500 })
  }
}
```

- [ ] **Step 4 : Lancer tous les tests**

```bash
npm test
```

Résultat attendu : tous les tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/api/schedule/publish/ lib/__tests__/publish-route.test.ts
git commit -m "feat: add /api/schedule/publish webhook with TDD"
```

---

## Task 12 : Server actions review + schedule

**Files:**
- Create: `lib/actions/review.ts`
- Create: `lib/actions/schedule.ts`

- [ ] **Step 1 : Créer lib/actions/review.ts**

```typescript
// lib/actions/review.ts
'use server'
import { revalidatePath } from 'next/cache'
import { getContentStatus, setContentStatus } from '../content-status'
import { improvePost } from '../agents/improve'
import { getPost } from '../posts'
import { getPostBySlug, updatePost } from '../db'
import type { ImproveOutput } from '../agents/improve'

export async function actionMarkReady(slug: string): Promise<void> {
  setContentStatus(slug, { status: 'ready', reviewedAt: new Date().toISOString() })
  revalidatePath('/admin/review')
}

export async function actionImproveWithAI(slug: string): Promise<ImproveOutput> {
  const post = await getPost(slug)
  const dbPost = getPostBySlug(slug)
  const result = await improvePost({
    slug,
    title: post.title,
    excerpt: post.excerpt,
    content: dbPost?.content ?? post.contentHtml,
    tags: post.tags,
  })
  setContentStatus(slug, {
    aiImprovedTitle: result.improvedTitle,
    aiImprovedExcerpt: result.improvedExcerpt,
    aiSuggestions: result.suggestions,
    aiAddedTags: result.addedTags,
  })
  revalidatePath('/admin/review')
  return result
}

export async function actionAcceptImprovement(slug: string): Promise<void> {
  const status = getContentStatus(slug)
  if (!status.aiImprovedTitle) return
  const dbPost = getPostBySlug(slug)
  if (dbPost) {
    updatePost(dbPost.id, {
      title: status.aiImprovedTitle,
      excerpt: status.aiImprovedExcerpt ?? dbPost.excerpt,
      tags: [...new Set([...dbPost.tags, ...(status.aiAddedTags ?? [])])],
    })
  }
  setContentStatus(slug, { status: 'ready', reviewedAt: new Date().toISOString() })
  revalidatePath('/admin/review')
}
```

- [ ] **Step 2 : Créer lib/actions/schedule.ts**

```typescript
// lib/actions/schedule.ts
'use server'
import { revalidatePath } from 'next/cache'
import { addToSchedule, removeFromSchedule } from '../schedule'
import { setContentStatus } from '../content-status'

export async function actionAddToSchedule(
  slug: string,
  source: 'fs' | 'db',
  scheduledAt: string
): Promise<void> {
  addToSchedule(slug, source, scheduledAt)
  setContentStatus(slug, { status: 'scheduled' })
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/review')
}

export async function actionRemoveFromSchedule(scheduleId: string, slug: string): Promise<void> {
  removeFromSchedule(scheduleId)
  setContentStatus(slug, { status: 'ready' })
  revalidatePath('/admin/schedule')
  revalidatePath('/admin/review')
}
```

- [ ] **Step 3 : Lancer les tests**

```bash
npm test
```

- [ ] **Step 4 : Commit**

```bash
git add lib/actions/review.ts lib/actions/schedule.ts
git commit -m "feat: add review and schedule server actions"
```

---

## Task 13 : Page admin Review

**Files:**
- Create: `app/admin/review/page.tsx`
- Create: `app/admin/review/ReviewClient.tsx`

- [ ] **Step 1 : Créer app/admin/review/page.tsx**

```typescript
// app/admin/review/page.tsx
import { getAllAdminPosts } from '@/lib/posts'
import { getContentStatus } from '@/lib/content-status'
import ReviewClient from './ReviewClient'

export default async function ReviewPage() {
  const posts = getAllAdminPosts()
  const postsWithStatus = posts.map(p => ({
    ...p,
    contentStatus: getContentStatus(p.slug),
  }))

  const unreviewed = postsWithStatus.filter(p => p.contentStatus.status === 'unreviewed')
  const ready = postsWithStatus.filter(p => p.contentStatus.status === 'ready')
  const scheduled = postsWithStatus.filter(p => p.contentStatus.status === 'scheduled')

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#f1f5f9', marginBottom: '2rem' }}>Queue de révision</h1>
      <ReviewClient unreviewed={unreviewed} ready={ready} scheduled={scheduled} />
    </div>
  )
}
```

- [ ] **Step 2 : Créer app/admin/review/ReviewClient.tsx**

```typescript
// app/admin/review/ReviewClient.tsx
'use client'
import { useTransition } from 'react'
import { actionMarkReady, actionImproveWithAI, actionAcceptImprovement } from '@/lib/actions/review'
import type { AdminPostRow } from '@/lib/posts'
import type { ContentStatus } from '@/lib/content-status'

type PostWithStatus = AdminPostRow & { contentStatus: ContentStatus }

function PostRow({ post }: { post: PostWithStatus }) {
  const [isPending, startTransition] = useTransition()
  const hasAI = !!post.contentStatus.aiImprovedTitle

  return (
    <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <p style={{ color: '#f1f5f9', fontWeight: 'bold', margin: 0 }}>{post.title}</p>
          {hasAI && (
            <p style={{ color: '#22c55e', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              IA → {post.contentStatus.aiImprovedTitle}
            </p>
          )}
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
            {post.slug} · {post.source}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {!hasAI && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => actionImproveWithAI(post.slug))}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              {isPending ? '...' : '✦ IA'}
            </button>
          )}
          {hasAI && (
            <button
              onClick={() => startTransition(() => actionAcceptImprovement(post.slug))}
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ✓ Accepter
            </button>
          )}
          <button
            onClick={() => startTransition(() => actionMarkReady(post.slug))}
            style={{ background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Prêt
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, posts, color }: { title: string; posts: PostWithStatus[]; color: string }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ color, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
        {title} ({posts.length})
      </h2>
      {posts.length === 0
        ? <p style={{ color: '#475569', fontSize: '0.85rem' }}>Aucun post</p>
        : posts.map(p => <PostRow key={p.slug} post={p} />)
      }
    </div>
  )
}

export default function ReviewClient({ unreviewed, ready, scheduled }: {
  unreviewed: PostWithStatus[]
  ready: PostWithStatus[]
  scheduled: PostWithStatus[]
}) {
  return (
    <div>
      <Section title="À réviser" posts={unreviewed} color="#f59e0b" />
      <Section title="Prêts" posts={ready} color="#22c55e" />
      <Section title="Schedulés" posts={scheduled} color="#3b82f6" />
    </div>
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add app/admin/review/
git commit -m "feat: add admin review page with AI improvement UI"
```

---

## Task 14 : Page admin Schedule + nav + GitHub Actions

**Files:**
- Create: `app/admin/schedule/page.tsx`
- Create: `app/admin/schedule/ScheduleClient.tsx`
- Modify: `app/admin/layout.tsx`
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1 : Créer app/admin/schedule/page.tsx**

```typescript
// app/admin/schedule/page.tsx
import { getSchedule } from '@/lib/schedule'
import { getAllAdminPosts } from '@/lib/posts'
import { getContentStatus } from '@/lib/content-status'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const schedule = getSchedule()
  const allPosts = getAllAdminPosts()
  const readyPosts = allPosts.filter(p => getContentStatus(p.slug).status === 'ready')

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ color: '#f1f5f9', marginBottom: '0.5rem' }}>Calendrier de publication</h1>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Lundi, Mercredi, Vendredi à 9h00 (Paris)</p>
      <ScheduleClient schedule={schedule} readyPosts={readyPosts} />
    </div>
  )
}
```

- [ ] **Step 2 : Créer app/admin/schedule/ScheduleClient.tsx**

```typescript
// app/admin/schedule/ScheduleClient.tsx
'use client'
import { useState, useTransition } from 'react'
import { actionAddToSchedule, actionRemoveFromSchedule } from '@/lib/actions/schedule'
import type { ScheduleEntry } from '@/lib/schedule'
import type { AdminPostRow } from '@/lib/posts'

function getNextSlots(count = 6): string[] {
  const slots: string[] = []
  const d = new Date()
  while (slots.length < count) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day === 1 || day === 3 || day === 5) {
      const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 7))
      slots.push(iso.toISOString())
    }
  }
  return slots
}

export default function ScheduleClient({
  schedule,
  readyPosts,
}: {
  schedule: ScheduleEntry[]
  readyPosts: AdminPostRow[]
}) {
  const [isPending, startTransition] = useTransition()
  const [selectedSlug, setSelectedSlug] = useState('')
  const slots = getNextSlots(6)

  const pendingSlots = schedule.filter(e => e.status === 'pending')
  const usedSlots = new Set(pendingSlots.map(e => e.scheduledAt.slice(0, 10)))

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Prochains créneaux
        </h2>
        {slots.map(slot => {
          const dateStr = slot.slice(0, 10)
          const scheduled = pendingSlots.find(e => e.scheduledAt.slice(0, 10) === dateStr)
          const label = new Date(slot).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

          return (
            <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', padding: '0.75rem', background: '#1e293b', borderRadius: '8px' }}>
              <span style={{ color: '#94a3b8', minWidth: '200px', fontSize: '0.9rem' }}>{label} 9h</span>
              {scheduled ? (
                <>
                  <span style={{ color: '#f1f5f9', flex: 1 }}>{scheduled.slug}</span>
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => actionRemoveFromSchedule(scheduled.id, scheduled.slug))}
                    style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Retirer
                  </button>
                </>
              ) : (
                <>
                  <select
                    value={selectedSlug}
                    onChange={e => setSelectedSlug(e.target.value)}
                    style={{ flex: 1, background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '6px', padding: '0.3rem 0.5rem' }}
                  >
                    <option value="">— choisir un post —</option>
                    {readyPosts.map(p => (
                      <option key={p.slug} value={p.slug}>{p.title}</option>
                    ))}
                  </select>
                  <button
                    disabled={isPending || !selectedSlug}
                    onClick={() => {
                      if (!selectedSlug) return
                      const post = readyPosts.find(p => p.slug === selectedSlug)!
                      startTransition(() => actionAddToSchedule(selectedSlug, post.source as 'fs' | 'db', slot))
                      setSelectedSlug('')
                    }}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Planifier
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3 : Ajouter les liens dans app/admin/layout.tsx**

Après la ligne `<Link href="/admin/obsidian"...>`, ajouter :

```typescript
          <span className={styles.navSection}>publication</span>
          <Link href="/admin/review" className={styles.navLink}>
            <span className={styles.navIcon}>⟳</span> Révision
          </Link>
          <Link href="/admin/schedule" className={styles.navLink}>
            <span className={styles.navIcon}>◷</span> Calendrier
          </Link>
```

- [ ] **Step 4 : Créer .github/workflows/publish.yml**

```yaml
# .github/workflows/publish.yml
name: Scheduled Publish

on:
  schedule:
    - cron: '0 7 * * 1,3,5'   # lun/mer/ven 9h Paris (UTC+2 en été, UTC+1 en hiver)
  workflow_dispatch:            # permet de déclencher manuellement depuis GitHub

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger publish webhook
        run: |
          curl -f -X POST "${{ secrets.SITE_URL }}/api/schedule/publish" \
            -H "Authorization: Bearer ${{ secrets.PUBLISH_SECRET }}" \
            -H "Content-Type: application/json"
```

Configurer dans GitHub → Settings → Secrets : `SITE_URL` et `PUBLISH_SECRET`.

- [ ] **Step 5 : Lancer tous les tests**

```bash
npm test
```

Résultat attendu : tous les tests PASS.

- [ ] **Step 6 : Commit final**

```bash
git add app/admin/schedule/ app/admin/layout.tsx .github/
git commit -m "feat: add schedule admin page, update nav, add GitHub Actions cron"
```

---

## Vérification finale

```bash
npm test                  # tous les tests passent
npm run build             # build sans erreur
npm run dev               # démarrer et tester manuellement :
                          # - /admin/review : liste des posts avec statuts
                          # - /admin/schedule : créneaux lun/mer/ven
                          # - /api/og/kubectl-cheatsheet-prod : image PNG
```

Variables d'env à ajouter dans `.env.local` :
```
ANTHROPIC_API_KEY=...
PUBLISH_SECRET=...
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_ACCOUNT_ID=...
YOUTUBE_API_KEY=...
YOUTUBE_CHANNEL_ID=...
```
