# Spec : Social Publishing Pipeline

**Date :** 2026-06-26  
**Projet :** alice-in-prodland  
**Scope :** Stratégie de publication 3x/semaine avec distribution sociale agentic sur LinkedIn, Instagram, YouTube, TikTok

---

## Contexte

Le blog alice-in-prodland est un site SRE/DevOps avec du contenu existant (11 posts FS + posts DB) jamais distribué de façon systématique. L'objectif est de mettre en place un pipeline complet :

1. Révision et amélioration du contenu existant (IA)
2. Scheduling automatique 3 fois par semaine
3. Distribution sociale agentic sur 4 plateformes
4. Alimentation continue du site depuis Obsidian / fichiers locaux

---

## Architecture globale

```
SOURCES DE CONTENU
  ├── On-premise : posts/*.md  (git push → détecté au redémarrage)
  ├── Obsidian vault → import action (déjà en place)
  └── Admin CMS → nouveau post direct

          ↓

REVIEW PIPELINE
  ├── Queue de révision : tous les posts non encore distribués
  ├── Agent amélioration (Claude) : SEO, clarté, exemples à jour
  └── Status : [unreviewed → ready → scheduled → distributed]

          ↓

SCHEDULER
  ├── 3 créneaux/semaine : lun/mer/ven 9h (Paris)
  ├── Queue ordonnée dans data/schedule.json
  └── GitHub Actions cron → POST /api/schedule/publish

          ↓

DISTRIBUTION SOCIALE
  ├── 1 appel Claude → 4 variantes plateforme
  ├── Satori → image PNG branded (0€)
  ├── LinkedIn API v2 (automatique)
  ├── Instagram Meta Graph API (automatique)
  ├── YouTube Community Posts API (automatique)
  └── TikTok : caption + script à copier (API fermée)
```

---

## Sous-système 1 — Review Pipeline

### Données : `data/content-status.json`

Fichier overlay par slug, couvre FS et DB sans modifier les schémas existants.

```typescript
interface ContentStatus {
  status: 'unreviewed' | 'ready' | 'scheduled' | 'distributed';
  reviewedAt?: string;
  aiImprovedTitle?: string;
  aiImprovedExcerpt?: string;
  aiSuggestions?: string[];       // 3 points à mettre à jour
  aiAddedTags?: string[];
}

// data/content-status.json : Record<slug, ContentStatus>
```

**Règle d'initialisation :**
- Posts FS existants → `unreviewed` au premier accès
- Posts DB nouvellement créés depuis l'admin → `ready` directement
- Nouveau post FS pushé → `unreviewed` au prochain redémarrage du serveur

### Module : `lib/content-status.ts`

```typescript
getContentStatus(slug: string): ContentStatus
setContentStatus(slug: string, update: Partial<ContentStatus>): void
getAllByStatus(status: ContentStatus['status']): Array<{ slug: string } & ContentStatus>
```

### Agent d'amélioration : `lib/agents/improve.ts`

Un seul appel Claude avec output structuré (JSON schema enforced) :

```typescript
interface ImproveOutput {
  improvedTitle: string       // optimisé SEO, max 70 chars
  improvedExcerpt: string     // accrocheur, max 150 chars
  suggestions: string[]       // exactement 3 points à mettre à jour
  addedTags: string[]         // tags manquants détectés
}

async function improvePost(post: PostMeta & { content: string }): Promise<ImproveOutput>
```

**Modèle :** `claude-haiku-4-5-20251001` (rapide, peu coûteux pour l'amélioration de contenu).

### Page admin : `app/admin/review/page.tsx`

Vue liste (pas de kanban complexe) avec 3 groupes :

- **À réviser** (status: unreviewed) — boutons "Améliorer avec IA" / "Marquer prêt"
- **Prêts** (status: ready) — bouton "Planifier"
- **Schedulés** (status: scheduled) — date/heure assignée, bouton "Retirer du planning"

L'admin voit le diff titre/excerpt côte à côte (original vs proposition IA) et accepte tout, en partie, ou rien.

---

## Sous-système 2 — Scheduler

### Données : `data/schedule.json`

```typescript
interface ScheduleEntry {
  id: string           // cuid()
  slug: string
  source: 'fs' | 'db'
  scheduledAt: string  // ISO 8601 avec timezone Paris
  status: 'pending' | 'published' | 'failed'
  publishedAt?: string
  error?: string
}
```

### Module : `lib/schedule.ts`

```typescript
getSchedule(): ScheduleEntry[]
addToSchedule(slug: string, source: 'fs' | 'db', scheduledAt: string): ScheduleEntry
removeFromSchedule(id: string): void
getNextPending(now?: Date): ScheduleEntry | null   // premier pending dont scheduledAt ≤ now
markPublished(id: string): void
markFailed(id: string, error: string): void
```

### Page admin : `app/admin/schedule/page.tsx`

Vue semaine avec les créneaux lun/mer/ven à 9h. Chaque créneau affiche le post assigné ou un état vide. L'admin glisse un post `ready` vers un créneau vide.

### Webhook : `POST /api/schedule/publish`

Sécurisé par `Authorization: Bearer <PUBLISH_SECRET>` (comparaison constant-time).

```
1. Vérifie le token → 401 si invalide
2. getNextPending(now) → 200 { status: 'no_pending' } si rien
3. Si source === 'fs' → importe en DB (actionImportFsPost) puis publie
   Si source === 'db' → publishPost directement
4. Déclenche generateAndDistribute(post)
5. markPublished(scheduleEntry.id)
6. setContentStatus(slug, { status: 'distributed' })
7. → 200 { status: 'published', slug }
```

**Gestion des créneaux manqués :** un seul post par appel webhook. Pas de rattrapage en masse — si un créneau est manqué, le post reste `pending` et sera publié au prochain appel cron si `scheduledAt` est dépassé.

### GitHub Actions : `.github/workflows/publish.yml`

```yaml
name: Scheduled Publish
on:
  schedule:
    - cron: '0 7 * * 1,3,5'   # lun/mer/ven 9h Paris (UTC+2 en été)

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger publish
        run: |
          curl -f -X POST "${{ secrets.SITE_URL }}/api/schedule/publish" \
            -H "Authorization: Bearer ${{ secrets.PUBLISH_SECRET }}"
```

Secrets GitHub à configurer : `SITE_URL`, `PUBLISH_SECRET`.

---

## Sous-système 3 — Distribution sociale agentic

### Agent principal : `lib/agents/social.ts`

Un seul appel Claude avec output structuré, modèle `claude-sonnet-4-6` :

```typescript
interface SocialDistributionOutput {
  linkedin: {
    text: string        // 1200-1500 chars, ton pro, 5 hashtags max
    articleUrl: string
  }
  instagram: {
    caption: string     // 150-200 chars, ton accessible, 8 hashtags max
    imagePrompt: string // description pour Satori (couleurs, style)
  }
  youtube: {
    communityPost: string  // 300-500 chars, question ouverte + lien
  }
  tiktok: {
    caption: string     // 80-100 chars, accrocheur
    script: string      // 5-7 bullet points pour filmer un short 60s
  }
}

async function generateSocialContent(post: {
  title: string
  excerpt: string
  content: string
  tags: string[]
  url: string
  type: ContentType
}): Promise<SocialDistributionOutput>
```

**Prompt système :** persona d'Alice (SRE DevOps Architect, Cegedim, audience tech francophone), ton authentique et direct, contraintes de chaque plateforme.

### Image sociale : `lib/social-image.ts`

Satori génère un PNG 1200×630 branded depuis JSX :

```typescript
async function generateSocialImage(post: {
  title: string
  tags: string[]
}): Promise<Buffer>   // PNG buffer
```

Sauvegardé dans `public/social/[slug].png`. Réutilisé pour :
- Instagram (uploadé via Meta Graph API)
- Open Graph meta tag du post blog (remplace l'OG image générique)

Accessible publiquement via `GET /api/og/[slug]` (génère à la demande si inexistant).

### Intégrations plateforme

**LinkedIn** (`lib/integrations/linkedin.ts`) — déjà en place, aucun changement.

**Instagram** (`lib/integrations/instagram.ts`) — nouveau :
```typescript
async function postToInstagram(payload: {
  imageUrl: string    // URL publique de l'image (NEXT_PUBLIC_SITE_URL + /social/slug.png)
  caption: string
}): Promise<IntegrationResult>
```
Utilise Meta Graph API : création du media container → publication.

**YouTube** (`lib/integrations/youtube.ts`) — nouveau :
```typescript
async function postYoutubeCommunity(payload: {
  text: string
}): Promise<IntegrationResult>
```
Utilise YouTube Data API v3 `communityPosts.insert`. Pas besoin de vidéo.

**TikTok** (`lib/integrations/tiktok.ts`) — comportement inchangé, caption + script stockés dans `IntegrationResult.id`.

### Orchestrateur : `lib/agents/distribute.ts`

```typescript
async function generateAndDistribute(post: DbPost): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`
  
  // 1. Génère image et contenu social en parallèle
  const [imageBuffer, socialContent] = await Promise.all([
    generateSocialImage(post),
    generateSocialContent({ ...post, url }),
  ])
  
  // 2. Sauvegarde l'image
  saveImage(post.slug, imageBuffer)
  const imageUrl = `${url.replace('/blog/' + post.slug, '')}/social/${post.slug}.png`
  
  // 3. Distribue sur les plateformes en parallèle
  const [linkedin, instagram, youtube, tiktok] = await Promise.all([
    postToLinkedIn({ ...socialContent.linkedin, url, tags: post.tags }),
    postToInstagram({ imageUrl, caption: socialContent.instagram.caption }),
    postYoutubeCommunity({ text: socialContent.youtube.communityPost }),
    prepareTikTokPost({ ...socialContent.tiktok, url, tags: post.tags, type: post.type }),
  ])
  
  // 4. Stocke les résultats
  updatePost(post.id, { integrations: { linkedin, instagram, youtube, tiktok } })
}
```

### Affichage dans l'admin

Chaque post éditable affiche un bloc "Distribution réseaux" :

```
LinkedIn   ✅ publié le 30/06 — voir le post →    [Republier]
Instagram  ✅ publié le 30/06 — voir le post →    [Republier]
YouTube    ✅ publié le 30/06 — voir le post →    [Republier]
TikTok     📋 caption prête                       [Copier] [Voir le script]
```

---

## Sous-système 4 — Tests unitaires

### Framework : Vitest

```bash
npm install -D vitest @vitest/coverage-v8
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'
export default defineConfig({
  test: { environment: 'node' },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } }
})
```

Scripts ajoutés à `package.json` :
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### Couverture cible

| Fichier test | Module testé | Points clés |
|---|---|---|
| `schedule.test.ts` | `lib/schedule.ts` | getNextPending, créneaux manqués, statuts invalides |
| `social-agent.test.ts` | `lib/agents/social.ts` | 4 variantes présentes, limites de longueur |
| `improve-agent.test.ts` | `lib/agents/improve.ts` | Parsing output structuré, champs requis |
| `content-status.test.ts` | `lib/content-status.ts` | Transitions de statut, initialisation par défaut |
| `publish-route.test.ts` | `app/api/schedule/publish` | 401 token invalide, 200 no-op, happy path |
| `linkedin.test.ts` | `lib/integrations/linkedin.ts` | Token manquant → skipped, API mockée → success |
| `instagram.test.ts` | `lib/integrations/instagram.ts` | Token manquant → skipped, upload image mocké |
| `youtube.test.ts` | `lib/integrations/youtube.ts` | Token manquant → skipped, community post mocké |

Claude API et les APIs sociales sont mockées dans tous les tests — pas d'appels réseau réels.

---

## Nouvelles variables d'environnement

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Scheduling
PUBLISH_SECRET=<token 32 chars minimum>

# Instagram
INSTAGRAM_ACCESS_TOKEN=...
INSTAGRAM_ACCOUNT_ID=...

# YouTube
YOUTUBE_API_KEY=...
YOUTUBE_CHANNEL_ID=...

# Déjà en place
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=...
NEXT_PUBLIC_SITE_URL=...
JWT_SECRET=...
ADMIN_PASSWORD=...
```

## Nouvelles dépendances

```bash
npm install @anthropic-ai/sdk satori @resvg/resvg-js
npm install -D vitest @vitest/coverage-v8
```

## Nouveaux fichiers

```
lib/
  agents/improve.ts
  agents/social.ts
  agents/distribute.ts
  integrations/instagram.ts
  integrations/youtube.ts
  schedule.ts
  content-status.ts
  social-image.ts
  __tests__/
    schedule.test.ts
    social-agent.test.ts
    improve-agent.test.ts
    content-status.test.ts
    publish-route.test.ts
    linkedin.test.ts
    instagram.test.ts
    youtube.test.ts

app/
  api/
    schedule/publish/route.ts
    og/[slug]/route.ts
  admin/
    review/page.tsx
    schedule/page.tsx

data/
  schedule.json          # initialisé vide []
  content-status.json    # initialisé {}

.github/workflows/
  publish.yml

vitest.config.ts
```

---

## Coût mensuel estimé

| Composant | Coût |
|---|---|
| Claude API (3 posts/semaine × 2 appels) | ~$2/mois |
| Satori (image génération) | 0€ |
| GitHub Actions cron | 0€ |
| LinkedIn / Instagram / YouTube APIs | 0€ (quotas gratuits) |
| **Total** | **~$2/mois** |
