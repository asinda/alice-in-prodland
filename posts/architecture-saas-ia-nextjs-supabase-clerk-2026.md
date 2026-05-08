---
title: "Architecture d'un SaaS IA en 2026 : Next.js + Supabase + Clerk + OpenAI — les vraies décisions"
date: "2026-05-07"
excerpt: "J'ai conçu deux SaaS IA cette année — LegalPulse (conformité légale automatisée) et JobTaillor (adaptation de CV par IA). Voici l'architecture que j'aurais voulu trouver avant de commencer : les vraies décisions, les vraies limites, les vrais coûts."
tags: ["SaaS", "architecture", "nextjs", "supabase", "devops", "AI"]
---

On voit beaucoup de "stack for SaaS" qui ressemblent à des listes de logos. Ce que je vais partager ici, c'est l'architecture que j'ai réellement utilisée sur deux projets — avec les décisions non-évidentes, les limites réelles, et ce que je ferais différemment.

## Le contexte — deux projets, une stack commune

**LegalPulse AI** : génération automatique de CGU, mentions légales, politique de confidentialité — mis à jour automatiquement selon la législation. Cible : freelances et solopreneurs.

**JobTaillor** : adaptation intelligente de CV à une offre d'emploi spécifique. L'utilisateur colle une URL de job LinkedIn/Indeed, son profil, et l'IA génère un CV optimisé.

Les deux partagent la même stack. Ce n'est pas un accident.

## La stack — et pourquoi ces choix

```
Frontend + Backend : Next.js 15 App Router (Server Actions)
Base de données    : Supabase (PostgreSQL managé)
Authentification   : Clerk
IA                 : OpenAI GPT-4o-mini
Paiement           : Stripe
Emails             : Resend
Déploiement        : Vercel
```

### Next.js App Router + Server Actions : un seul repo, pas de séparation frontend/backend

La décision la plus structurante. Avec les Server Actions, je n'écris pas d'API REST séparée — les actions côté serveur sont dans le même fichier que les composants React. Pour un seul dev ou une petite équipe, c'est un gain énorme de complexité.

```typescript
// app/cv/generate/actions.ts
'use server';

export async function generateCV(jobUrl: string, userProfile: UserProfile) {
  // Vérifie la limite utilisateur (5 CV/mois sur plan gratuit)
  const usage = await checkUsageLimit(userId);
  if (usage.exceeded) throw new Error('Limite mensuelle atteinte');

  // Parse l'offre d'emploi
  const jobDetails = await parseJobUrl(jobUrl);
  
  // Appel OpenAI
  const adaptedCV = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: buildCVPrompt(userProfile, jobDetails),
  });

  // Sauvegarde en base
  await supabase.from('cvs').insert({ userId, content: adaptedCV, jobUrl });
  
  return adaptedCV;
}
```

### Supabase — RLS dès le départ, pas après

La fonctionnalité critique de Supabase n'est pas PostgreSQL (n'importe qui peut vous donner du Postgres). C'est le **Row Level Security intégré** : chaque utilisateur ne peut voir que ses propres données, et ça se configure au niveau base de données, pas dans le code applicatif.

```sql
-- Policy : un utilisateur ne voit que ses CV
create policy "Users can only see own CVs"
on cvs for all
using (auth.uid() = user_id);
```

L'erreur classique : activer RLS en production après le lancement. Chaque requête qui fonctionnait avant commence à retourner des tableaux vides. On active RLS dès le départ, avant le premier déploiement.

### Clerk — ne pas écrire son propre système d'auth en 2026

Je l'ai fait une fois. Une seule fois. JWT, refresh tokens, sessions, OAuth providers, MFA, RBAC... c'est des mois de travail pour gérer correctement ce que Clerk fait en 30 minutes d'intégration.

Plan gratuit : 10 000 utilisateurs actifs par mois. Pour 95% des SaaS en early stage, c'est suffisant pour valider et même monétiser avant de payer.

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/cv(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});
```

### OpenAI gpt-4o-mini — pas gpt-4o

Le ratio coût/qualité de `gpt-4o-mini` est la vraie révélation de 2025. Pour des tâches structurées (adapter un CV à une description de poste, générer des documents légaux à partir de templates) il fait 90% du travail de `gpt-4o` à 5% du prix.

Sur JobTaillor : ~$0.02 par CV généré. Sur LegalPulse : ~$0.01 par document. À 500 utilisateurs actifs, le coût IA est $10-15/mois. C'est gérable.

La limite : les tâches de raisonnement complexe ou créatif. Là, `gpt-4o` ou les modèles de reasoning (o1, o3) font la différence. Mais pour du traitement documentaire structuré, `gpt-4o-mini` suffit.

## Architecture des couches

```
Browser → Next.js Frontend (React Server Components)
              │
              ↓ Server Actions (pas d'API REST séparée)
         Next.js Backend
              │
    ┌─────────┼──────────┐
    ↓         ↓          ↓
Supabase    Clerk      OpenAI
(données)   (auth)      (IA)
              │
              ↓
           Stripe
          (paiement)
```

Les services sont découplés mais ils communiquent tous via le même process Next.js. Pas de microservices, pas de files de messages — trop de complexité pour le stade early stage.

## Les limites réelles (ce qu'on ne te dit pas)

### Vercel + Supabase = cold starts sur les plans gratuits

Sur le plan hobby Vercel, les fonctions serverless se "refroidissent" après inactivité. La première requête après un cold start prend 2-4 secondes. Pour un SaaS en production avec des utilisateurs payants, il faut passer sur un plan qui maintient les instances chaudes.

Alternative : déployer sur Fly.io avec une machine qui tourne en continu (~$5/mois). C'est ce que j'ai fait pour alice-in-prodland justement.

### Supabase Storage et fichiers volumineux

Les PDF générés par JobTaillor : stockés dans Supabase Storage. Ça fonctionne bien jusqu'à quelques Go. Au-delà, migrer vers S3 ou R2 (Cloudflare) est plus économique.

### OpenAI rate limits

L'API OpenAI a des limites de tokens par minute selon le tier. En early stage (Tier 1), tu es limité à 200k tokens/minute sur gpt-4o-mini. Pour de la génération de documents en batch, ça peut bloquer. Solution : queue de traitement asynchrone avec exponential backoff.

```typescript
async function callOpenAIWithRetry(params: ChatCompletionParams, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await openai.chat.completions.create(params);
    } catch (err) {
      if (err.status === 429 && attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw err;
    }
  }
}
```

## Sécurité — les 5 couches non-négociables

```
1. Clerk          → Auth + sessions JWT (ne pas écrire soi-même)
2. Middleware      → Protection des routes côté Next.js
3. RLS Supabase   → Isolation données par utilisateur au niveau DB
4. Zod            → Validation de toutes les entrées (jamais se fier au client)
5. Variables .env → Aucun secret dans le code source
```

Le point 4 est celui qu'on zappe en early stage et qu'on regrette. Un utilisateur malveillant peut envoyer n'importe quoi à ta Server Action. Sans validation Zod, c'est une injection ou une consommation excessive d'API OpenAI.

```typescript
import { z } from 'zod';

const GenerateCVSchema = z.object({
  jobUrl: z.string().url().max(2000),
  experience: z.array(z.object({
    company: z.string().max(200),
    role: z.string().max(200),
    duration: z.string().max(100),
  })).max(20),
});

export async function generateCV(rawInput: unknown) {
  const input = GenerateCVSchema.parse(rawInput); // throw si invalide
  // ...
}
```

## Ce que je referais différemment

**Définir les limites d'usage dès le départ.** Sur JobTaillor, j'ai ajouté les limites de CV/mois après le premier abus (quelqu'un qui avait généré 200 CVs en une nuit). Le système de comptage aurait dû être là dès le premier commit.

**Tester le flux de paiement en production avant le lancement.** Stripe webhook en local avec `stripe listen --forward-to localhost:3000/api/webhooks/stripe` fonctionne bien. Mais le comportement en production avec les certificats et les timeouts est différent. Testons en staging avec de vraies cartes de test.

**Monitoring applicatif dès le départ.** Vercel donne des métriques d'infrastructure (latence, erreurs HTTP). Ce qu'il ne donne pas : le taux de succès des générations IA, le temps moyen par génération, les prompts qui échouent. Sentry + quelques métriques custom — pas une semaine de travail, mais une journée.

---

*Si tu construis un SaaS IA et que tu as des questions sur l'architecture ou les choix de stack, les commentaires sont ouverts. Les vraies questions méritent des vraies réponses, pas des démos de happy path.*
