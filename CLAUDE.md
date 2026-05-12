# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (2 GB Node heap via cross-env)
npm run build    # Production build (also 2 GB heap)
npm run start    # Start production server
npm run lint     # ESLint check
```

No test framework is configured.

## Architecture

**Next.js 16.2 (App Router) + React 19 + TypeScript 5.** Content-first SRE/DevOps blog with an admin CMS and social publishing integrations.

### i18n

All public routes live under `app/[locale]/`. Locales: `fr` (default), `en`. The next-intl plugin in `next.config.ts` handles routing; `middleware.ts` applies it after the admin JWT check. Server components call `setRequestLocale(locale)` + `getTranslations()`. Client components use `NextIntlClientProvider` (provided in the locale layout). Translation files: `messages/fr.json`, `messages/en.json`.

### Admin

`app/admin/` is **outside** the `[locale]` segment — no i18n. Protected by a JWT cookie (`admin-token`, HS256 via `jose`, 7-day expiry). Middleware verifies the token on all `/admin/*` routes except `/admin/login`. Single shared password from `ADMIN_PASSWORD` env var.

### Data Layer — two sources merged in `lib/posts.ts`

| Source | Location | Cache | Priority |
|---|---|---|---|
| Filesystem posts | `posts/*.md` (gray-matter frontmatter) | In-process memory (immutable per deploy) | Lower |
| Database posts | `data/posts.json` (admin-created) | **No cache** — read fresh every request | Higher |

DB posts always win on slug collision. The same unified remark→rehype pipeline (GFM → rehype-slug → rehype-highlight) renders both. ToC is extracted from generated heading IDs (h2/h3 only).

Courses are DB-only: `data/courses.json`. Lessons carry an `order` field for prev/next navigation.

### Server Actions

All admin mutations are server actions in `lib/actions/`. They use `useActionState()` (React 19 pattern) in the admin forms and call `revalidatePath()` after writes.

### Middleware execution order

1. Admin JWT check (`/admin/*` → verify or redirect to `/admin/login`)
2. next-intl routing (locale redirect / rewrite)
3. Redirect URL sanitization — strips the internal Render.com port from `Location` headers so the browser never sees `:3000`/`:10000`. Always rebuild redirects via `NEXT_PUBLIC_SITE_URL`.

### Integrations (`lib/integrations/`)

- **LinkedIn** — Share API v2 (article cards). Requires `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_PERSON_URN`.
- **TikTok** — Caption generator only (copy-paste; no API call).
- **Gumroad** — URL reachability check + dashboard pre-fill link. No product creation API.

Each integration result is stored in the post/course JSON record (`integrations` field).

### Obsidian Import (`lib/obsidian.ts`)

Reads the vault at `OBSIDIAN_VAULT_PATH`, strips Obsidian-specific syntax (`![[…]]`, `^block-refs`, callout blocks), extracts title from frontmatter or first H1, and imports the file as a draft post.

## Key Environment Variables

```
JWT_SECRET                 # HS256 signing key
ADMIN_PASSWORD             # Single admin password
NEXT_PUBLIC_SITE_URL       # Canonical URL — used in middleware redirect sanitization
OBSIDIAN_VAULT_PATH        # Absolute path to local Obsidian vault
LINKEDIN_ACCESS_TOKEN
LINKEDIN_PERSON_URN        # urn:li:person:...
```

## Deployment

Docker multi-stage build (Alpine + Node 22, `output: standalone`). `docker-entrypoint.sh` seeds `data/posts.json` and `data/courses.json` from `data-seed/` if missing. Mount `/app/data` as a persistent volume. Hosted on Render.com.

TypeScript build errors and ESLint errors are both intentionally suppressed during builds (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`).
