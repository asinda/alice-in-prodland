# Alice in Prodland

Blog SRE / DevOps bilingue (FR/EN) avec CMS d'administration, cours en ligne et publication automatisée sur les réseaux sociaux.

![CI](https://github.com/OWNER/alice-in-prodland/actions/workflows/ci.yml/badge.svg)

## Fonctionnalités

- **Blog** : articles Markdown (fichiers `posts/`) et articles créés via l'admin (`data/posts.json`), rendu GFM + coloration syntaxique, table des matières, barre de progression.
- **Cours** : cours structurés en leçons avec navigation précédent/suivant.
- **i18n** : français (défaut) et anglais via `next-intl`, traduction assistée par IA.
- **Admin** (`/admin`) : CRUD articles/cours, import de notes Obsidian, relecture IA, planification, statistiques.
- **Diffusion** : LinkedIn, Instagram, YouTube, TikTok (légende), Gumroad ; image Open Graph générée (`/api/og/[slug]`).
- **Publication planifiée** : workflow GitHub Actions (lun/mer/ven) appelant `POST /api/schedule/publish`.
- **Mode maintenance** : `MAINTENANCE_MODE=true` avec cookie de prévisualisation.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · next-intl · remark/rehype · jose (JWT) · Anthropic SDK · Vitest · Docker (Node 22 Alpine, `output: standalone`).

## Démarrage

```bash
cp .env.example .env.local   # puis renseigner les variables
npm ci
npm run dev                  # http://localhost:3000
```

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Vérification des types |
| `npm test` | Tests unitaires (Vitest) |

> Sous Windows, lancez les commandes depuis un chemin à la casse exacte du lecteur (`C:\…`) : un `c:\…` en minuscule provoque une double instance de Vitest.

## Variables d'environnement

Voir [.env.example](.env.example). `JWT_SECRET` et `ADMIN_PASSWORD` sont obligatoires en production.

## Architecture

```
app/[locale]/   pages publiques (blog, cours, about)
app/admin/      CMS (hors i18n, protégé par JWT)
app/api/        og (image sociale), schedule/publish (webhook)
lib/            posts, db (JSON), agents IA, intégrations, actions serveur
posts/          articles Markdown versionnés
data/           base JSON (posts, cours, planning, traductions)
messages/       traductions de l'interface
```

Les articles viennent de deux sources fusionnées dans `lib/posts.ts` ; en cas de conflit de slug, l'article de la base JSON l'emporte. Détails : [CLAUDE.md](CLAUDE.md) et [docs/bilingual-fr-en.md](docs/bilingual-fr-en.md).

## Déploiement

Image Docker multi-stage (utilisateur non-root). Monter `/app/data` comme volume persistant : `docker-entrypoint.sh` y copie les données initiales de `data-seed/` si le volume est vide. Hébergé sur Render.com ; renseigner `NEXT_PUBLIC_SITE_URL` pour que les redirections n'exposent pas le port interne.

## CI

`.github/workflows/ci.yml` : lint, types, tests et build à chaque push / PR. `publish.yml` : publication planifiée.
