---
title: "Claude Code dans un workflow DevOps : ce que ça change vraiment"
date: "2026-05-06"
excerpt: "J'utilise Claude Code depuis 3 mois dans mon quotidien SRE. Voici ce qui m'a surpris, ce que ça remplace, et ce que ça ne remplacera jamais — avec des exemples concrets sur des pipelines GitLab, des configs Kubernetes, et du Terraform."
tags: ["claude-code", "devops", "SRE", "automatisation", "AI", "outils"]
---

Je suis sceptique par défaut avec les outils "IA pour dev". Trop de promesses, trop de demos sur des hello world. Alors quand j'ai commencé à utiliser Claude Code, je m'y suis mis sans attentes — juste pour voir.

Trois mois plus tard, c'est dans mon workflow quotidien. Voici pourquoi.

## Ce qu'est vraiment Claude Code

Claude Code n'est pas un copilote qui complète tes lignes. C'est un agent qui tourne dans ton terminal, lit ton codebase, exécute des commandes, et travaille sur des tâches complètes.

La différence pratique :

- **Copilote** : tu écris `docker`, il complète `docker run -d --name...`
- **Claude Code** : tu dis "génère le Dockerfile pour cette app Node.js avec multi-stage build et utilisateur non-root", il lit ton `package.json`, écrit le Dockerfile complet, et t'explique pourquoi il a fait chaque choix

```bash
# Installation
npm install -g @anthropic-ai/claude-code

# Lancer dans ton projet
claude
```

## Les 3 modes — lequel utiliser quand

### Mode interactif (défaut)

Claude propose chaque modification et attend ton approbation. C'est ce que j'utilise pour **tout ce qui touche à l'infra en production**. Je veux voir chaque changement avant qu'il soit appliqué.

### Mode auto

Claude travaille en autonome, édite les fichiers directement. Utile pour :
- Générer du scaffolding (templates, boilerplate)
- Refactoring de code pur sans risque
- Écrire des tests

### Mode plan (`Shift+Tab` deux fois)

Claude réfléchit d'abord, propose un plan, attend ton accord, puis exécute. C'est ce que j'utilise pour les **tâches complexes multi-fichiers**. Par exemple : "migre ce pipeline GitLab de l'ancienne syntaxe vers les règles `needs:` + matrice d'environnement".

## Cas d'usage réels — ce qui m'a convaincu

### 1. Debugging de pipelines GitLab

Mon cas le plus fréquent. Un pipeline casse, l'erreur est cryptique, je colle le log dans Claude Code :

```
"Ce job échoue avec : error: failed to solve: failed to read dockerfile:
open Dockerfile: no such file or directory. Le contexte Docker est ./services/api/"
```

En 10 secondes, Claude identifie que `context: ./services/api/` et `dockerfile: Dockerfile` cherche le Dockerfile dans `./services/api/Dockerfile`, alors que le Dockerfile est à la racine. Il propose le correctif et explique pourquoi — pas juste le fix, la logique.

### 2. Génération de manifests Kubernetes

Je donne une description :

> "Crée un Deployment pour une app Python FastAPI, 3 réplicas, liveness probe sur /health port 8000, requests 100m/128Mi limits 500m/512Mi, rolling update avec maxUnavailable: 0"

Claude génère le YAML complet, annoté, prêt à `kubectl apply`. Ce qui prenait 15 minutes de copier-coller entre docs et ajustements prend 30 secondes.

### 3. Écriture de modules Terraform

Pour des patterns répétitifs (créer un module Terraform pour un bucket S3 avec policy et versioning), Claude Code est imbattable. Il lit le contexte existant de ton module, respecte tes conventions de nommage, et génère du code cohérent avec ce qui est déjà là.

### 4. Navigation dans une codebase inconnue

Quand je reprends un projet que je n'ai pas touché depuis 6 mois :

```bash
"Explique le flux de l'authentification dans ce projet, depuis le middleware
jusqu'au stockage de session"
```

Claude lit les fichiers pertinents et te donne un résumé structuré. Pas une doc générique — une explication basée sur **ton** code.

## Ce que ça ne remplace pas

Soyons honnêtes.

**Les décisions d'architecture** : Claude peut te proposer des patterns, mais décider si tu sharde MongoDB ou pas, si tu passes en microservices ou pas — c'est ton contexte métier, ton équipe, ton budget. L'IA génère des options, elle ne décide pas.

**La compréhension profonde des incidents** : En P1, je ne veux pas une suggestion probabiliste. Je veux des faits. Claude Code peut m'aider à aller plus vite (génère une requête PromQL, explique un stack trace), mais l'analyse causale reste humaine.

**La connaissance implicite** : Claude ne sait pas que votre cluster Kubernetes a une quirk avec les PodDisruptionBudgets à cause d'une version d'opérateur spécifique. Cette connaissance-là, elle est dans les têtes de l'équipe et les post-mortems.

## Configuration CLAUDE.md — l'investissement qui change tout

Le fichier `CLAUDE.md` à la racine du projet est lu par Claude au démarrage. C'est là que tu lui donnes le contexte permanent :

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

Avec ça, Claude respecte tes conventions sans que tu aies à les rappeler à chaque session.

## Verdict après 3 mois

Claude Code m'a rendu plus rapide sur les tâches répétitives et la génération de code. Il m'a fait gagner probablement 1-2h par jour sur des tâches de plomberie (écriture de configs, debugging de syntaxe, navigation de code).

Ce qu'il ne m'a pas rendu : meilleure dans mon métier. Ça, c'est l'expérience terrain, les post-mortems, et les heures passées à débugger des problèmes que personne n'avait documentés.

L'outil amplifie ce que tu sais déjà faire. Il ne remplace pas la compétence.

---

*Claude Code est disponible via `npm install -g @anthropic-ai/claude-code`. L'extension VS Code est en beta — elle fonctionne bien pour ceux qui préfèrent une interface graphique.*
