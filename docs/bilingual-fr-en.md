# Système bilingue FR / EN

## Architecture

```
posts/
  fr/   ← sources en français (écriture humaine)
  en/   ← traductions anglaises (générées)

data/
  posts.json      ← posts admin (titleEn, excerptEn, contentEn inclus)
  translations.json ← legacy, non utilisé (remplacé par posts/en/)
```

## Deux types de posts

| Type | Source FR | Traduction EN |
|---|---|---|
| **FS post** | `posts/fr/[slug].md` | `posts/en/[slug].md` |
| **DB post** | champ `content` dans `data/posts.json` | champs `contentEn`, `titleEn`, `excerptEn` dans `data/posts.json` |

## Routing i18n

Toutes les routes publiques sont sous `app/[locale]/`. Locales : `fr` (défaut), `en`.

- `/fr/blog` → liste des posts avec titres/extraits FR
- `/en/blog` → liste des posts avec titres/extraits EN (traduits)
- `/fr/blog/[slug]` → article en français
- `/en/blog/[slug]` → article en anglais

## Comment ça fonctionne côté code

### Lecture d'une traduction FS (`lib/translations.ts`)

```ts
getTranslation(slug)  // lit posts/en/[slug].md → { titleEn, excerptEn, contentEn }
setTranslation(slug, t) // écrit posts/en/[slug].md (écriture atomique)
getAllTranslations()   // liste tous les fichiers dans posts/en/
```

### Page de liste (`app/[locale]/blog/page.tsx`)

Si `locale === 'en'` :
- cherche `titleEn` / `excerptEn` dans le post DB (si DB post)
- sinon cherche dans `posts/en/[slug].md` (si FS post)
- fallback : titre/extrait FR

### Page article (`app/[locale]/blog/[slug]/page.tsx`)

Si `locale === 'en'` :
- cherche `contentEn` dans le post DB ou `posts/en/[slug].md`
- re-render le markdown EN via `renderMarkdown()`
- fallback : contenu FR

## Ajouter un nouvel article

1. Écrire l'article dans `posts/fr/[slug].md`
2. Lancer la traduction :
   ```bash
   node scripts/translate-all.mjs
   ```
   Le script génère automatiquement `posts/en/[slug].md`.
3. Commiter les deux fichiers.

## Re-traduire un article existant

Supprimer le fichier `posts/en/[slug].md` puis relancer le script.

## Script de traduction (`scripts/translate-all.mjs`)

- Utilise l'API Google Translate non-officielle (gratuite, sans compte, sans clé)
- Préserve les blocs de code (```` ``` ````) intacts
- Sauvegarde incrémentale après chaque post (résistant aux interruptions)
- Ignore les posts déjà traduits (idempotent)
- Couvre DB posts (→ `data/posts.json`) et FS posts (→ `posts/en/`)

## Sécurité

Le slug est validé dans `lib/translations.ts` avant tout accès filesystem :
```ts
if (!/^[a-zA-Z0-9_-]+$/.test(slug)) throw new Error('Invalid slug');
```
Empêche toute path traversal (`../../etc/passwd`).
