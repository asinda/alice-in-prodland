---
title: "Claude Code in a DevOps workflow: what it really changes"
excerpt: "I have been using Claude Code for 3 months in my daily SRE. Here's what surprised me, what it replaces, and what it will never replace with concrete examples on GitLab pipelines, Kubernetes configs, and Terraform."
translatedAt: "2026-08-08T07:21:07.376Z"
---

I'm skeptical by default with "AI for dev" tools. Too many promises, too many demos on hello world. So when I started using Claude Code, I went into it without expectations just to see.

Three months later, it’s in my daily workflow. Here's why.

## What Claude Code really is

Claude Code is not a co-pilot who completes your lines. It's an agent that runs in your terminal, reads your codebase, executes commands, and works on complete tasks.

The practical difference:

- **Copilot**: you write `docker`, it completes `docker run -d --name...`
- **Claude Code**: you say "generate the Dockerfile for this Node.js app with multi-stage build and non-root user", he reads your `package.json`, writes the complete Dockerfile, and explains to you why he made each choice

```bash
# Installation
npm install -g @anthropic-ai/claude-code

# Lancer dans ton projet
claude
```

## The 3 modes which to use when

### Interactive mode (default)

Claude proposes each modification and awaits your approval. This is what I use for **everything related to production infrastructure**. I want to see every change before it is applied.

### Auto mode

Claude works independently, edits files directly. Useful for:
- Generate scaffolding (templates, boilerplate)
- Risk-free pure code refactoring
- Write tests

### Outline mode (`Shift+Tab` twice)

Claude thinks first, comes up with a plan, waits for your agreement, then executes. This is what I use for **complex multi-file tasks**. For example: "migrates this GitLab pipeline from the old syntax to the `needs:` rules + environment matrix".

## Real use cases which convinced me

### 1. Debugging GitLab pipelines

My most frequent case. A pipeline breaks, the error is cryptic, I paste the log into Claude Code:

```
"Ce job échoue avec : error: failed to solve: failed to read dockerfile:
open Dockerfile: no such file or directory. Le contexte Docker est ./services/api/"
```

In 10 seconds, Claude identifies that `context: ./services/api/` and `dockerfile: Dockerfile` is looking for the Dockerfile in `./services/api/Dockerfile`, while the Dockerfile is at the root. He proposes the fix and explains why not just the fix, the logic.

### 2. Generating Kubernetes manifests

I give a description:

> "Create a Deployment for a Python FastAPI app, 3 replicas, liveness probe on /health port 8000, requests 100m/128Mi limits 500m/512Mi, rolling update with maxUnavailable: 0"

Claude generates the complete, annotated YAML, ready to `kubectl apply`. What took 15 minutes of copying and pasting between docs and adjustments takes 30 seconds.

### 3. Writing Terraform modules

For repetitive patterns (creating a Terraform module for an S3 bucket with policy and versioning), Claude Code is unbeatable. It reads the existing context of your module, respects your naming conventions, and generates code consistent with what is already there.

### 4. Navigating an unknown codebase

When I take on a project that I haven't touched for 6 months:

```bash
"Explique le flux de l'authentification dans ce projet, depuis le middleware
jusqu'au stockage de session"
```

Claude reads the relevant files and gives you a structured summary. Not a generic doc an explanation based on **your** code.

## What it does not replace

Let's be honest.

**Architectural decisions**: Claude can offer you patterns, but deciding whether you shard MongoDB or not, whether you switch to microservices or not is your business context, your team, your budget. AI generates options, it does not decide.

**Deep understanding of incidents**: In P1, I don't want a probabilistic suggestion. I want facts. Claude Code can help me go faster (generates a PromQL query, explains a stack trace), but the causal analysis remains human.

**Implicit knowledge**: Claude does not know that your Kubernetes cluster has a quirk with PodDisruptionBudgets because of a specific operator version. This knowledge is in the heads of the team and the post-mortems.

## Configuration CLAUDE.md the investment that changes everything

The `CLAUDE.md` file at the root of the project is read by Claude at startup. This is where you give it the permanent context:

```markdown
# CLAUDE.md

## Stack
- Kubernetes 1.29 sur Fly.io
- GitLab CI/CD avec runners partagés
- Terraform 1.7 + Terraform Cloud

## Conventions
- Toutes les ressources Terraform dans modules/
- Variables dans variables.tf, outputs dans outputs.tf
- Nommage: {env}-{service}-{ressource}

## À ne jamais faire
- Ne jamais modifier les fichiers .tfstate directement
- Ne jamais hardcoder de secrets (utiliser Vault)
- Ne pas utiliser `kubectl apply` sans `--dry-run=client` d'abord
```

With this, Claude respects your conventions without you having to remind them each session.

## Verdict after 3 months

Claude Code made me faster on repetitive tasks and code generation. It saved me probably 1-2 hours per day on plumbing tasks (writing configs, syntax debugging, code navigation).

What it didn't make me better at my job. That's the field experience, the post-mortems, and the hours spent debugging problems that no one had documented.

The tool amplifies what you already know how to do. It does not replace skill.

---

*Claude Code is available via `npm install -g @anthropic-ai/claude-code`. The VS Code extension is in beta and works well for those who prefer a graphical interface.*
