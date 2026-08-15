---
title: "Architecture of an AI SaaS in 2026: Next.js + Supabase + Clerk + OpenAI   the real decisions"
excerpt: "I designed two AI SaaS this year   LegalPulse (automated legal compliance) and JobTaillor (AI CV adaptation). Here is the architecture I would have liked to find before starting: the real decisions, the real limits, the real costs."
translatedAt: "2026-08-15T13:05:48.809Z"
---

We see a lot of "stack for SaaS" that look like lists of logos. What I'm going to share here is the architecture that I actually used on two projects   with the non-obvious decisions, the actual boundaries, and what I would do differently.

## Context   two projects, one common stack

**LegalPulse AI**: automatic generation of UGC, legal notices, privacy policy automatically updated according to legislation. Target: freelancers and solopreneurs.

**JobTaillor**: Intelligent CV adaptation to a specific job offer. The user pastes a LinkedIn/Indeed job URL, their profile, and the AI generates an optimized resume.

The two share the same stack. It's not an accident.

## The stack   and why these choices

```
Frontend + Backend: Next.js 15 App Router (Server Actions)
Database: Supabase (Managed PostgreSQL)
Authentication: Clerk
AI: OpenAI GPT-4o-mini
Payment: Stripe
Emails: Resend
Deployment: Vercel
```

### Next.js App Router + Server Actions: single repo, no frontend/backend separation

The most structuring decision. With Server Actions, I don't write a separate rest API the server-side actions are in the same file as the React components. For a single dev or a small team, this is a huge gain in complexity.

```typescript
// app/cv/generate/actions.ts
'use server';

export async function generateCV(jobUrl: string, userProfile: UserProfile) {
  // Checks the user limit (5 CV/month on free plan)
  const use = await checkUsageLimit(userId);
  if (usage.exceeded) throw new Error('Monthly limit reached');

// Parse the job offer
  const jobDetails = await parseJobUrl(jobUrl);
  
  //OpenAI Call
  const adaptedCV = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: buildCVPrompt(userProfile, jobDetails),
});

  // Backup to database
  await supabase.from('cvs').insert({ userId, content: adaptedCV, jobUrl });
  
  return adaptedCV;
}
```

### Supabase   RLS from the start, not after

Supabase's critical feature is not PostgreSQL (anyone can give you Postgres). This is the integrated Row Level Security: each user can only see their own data, and it is configured at the database level, not in the application code.

```sql
-- Policy: a user only sees their resumes
create policy "Users can only see own CVs"
on cvs for all
using (auth.uid() = user_id);
```

The classic mistake: activate RLS in production after launch. Every query that worked before starts returning empty arrays. RLS is activated from the outset, before the first deployment.

### Clerk   not writing his own auth system in 2026

I did it once. Only once. JWT, refresh tokens, sessions, OAuth providers, MFA, RBAC... these are months of work to properly manage what Clerk does in 30 minutes of integration.

Free plan: 10,000 active users per month. For 95% of early stage SaaS, this is enough to validate and even monetize before paying.

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/api/cv(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});
```

### OpenAI gpt-4o-mini   pas gpt-4o

The cost/quality ratio of `gpt-4o-mini` is the true revelation of 2025. For structured tasks (adapting a CV to a job description, generating legal documents from templates) it does 90% of the work from `gpt-4o` to 5% of the price.

On JobTaillor: ~$0.02 per CV generated. On LegalPulse: ~$0.01 per document. With 500 active users, the AI cost is $10-15/month. It's manageable.

The limit: complex or creative reasoning tasks. There, `gpt-4o` or reasoning models (o1, o3) make the difference. But for structured document processing, `gpt-4o-mini` is enough.

## Layer architecture

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

The services are decoupled but they all communicate via the same Next.js process. No microservices, no message queues too complex for the early stage.

## Real limits (what you are not told)

### Vercel + Supabase = cold starts on free plans

On the Vercel hobby level, serverless functions "cool down" after inactivity. The first request after a cold start takes 2-4 seconds. For a SaaS in production with paying users, you need to switch to a plan that keeps instances hot.

Alternative: deploy on Fly.io with a machine that runs continuously (~$5/month). That's exactly what I did for alice-in-prodland.

### Supabase Storage and large files

PDFs generated by JobTaillor: stored in Supabase Storage. It works well up to a few GBs. Beyond that, migrating to S3 or R2 (Cloudflare) is more economical.

### OpenAI rate limits

The OpenAI API has token limits per minute depending on the tier. In early stage (Tier 1), you are limited to 200k tokens/minute on gpt-4o-mini. For batch document generation, this can block. Solution: Asynchronous processing queue with exponential backoff.

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

## Security   the 5 non-negotiable layers

```
1. Clerk          → Auth + JWT sessions (do not write yourself)
2. Middleware Road      → protection on the Next.js side
3. RLS Supabase   → Isolation data per user at DB level
4. Zod            → Validation of all entries (never trust the customer)
5. .env variables → No secrets in the source code
```

Point 4 is the one we skip in early stage and regret. A malicious user can send anything to your Server Action. Without Zod validation, this is an injection or excessive consumption of OpenAI APIs.

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
  const input = GenerateCVSchema.parse(rawInput); // throw if invalid
// ...
}
```

## What I would do differently

**Set usage limits up front.** On JobTaillor, I added the CV/month limits after the first abuse (someone who had generated 200 CVs in one night). The counting system should have been there from the first commit.

**Test the payment flow in production before launch.** Stripe webhook locally with `stripe listen --forward-to localhost:3000/api/webhooks/stripe` works well. But the behavior in production with certificates and timeouts is different. Let's staging test with real test cards.

** Application monitoring from the start.** Vercel gives infrastructure metrics (latency, HTTP errors). What it does not give: the success rate of AI generations, the average time per generation, the prompts who fail. Sentry + some custom metrics not a week's work, but a day's work.

---

*If you're building an AI SaaS and have questions about the architecture or stack choices, comments are open. Real questions deserve real answers, not happy path demos.*
