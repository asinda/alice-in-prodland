---
title: "CI/CD vers Kubernetes avec GitHub Actions : le pipeline que j'aurais voulu avoir dès le départ"
date: "2025-03-20"
excerpt: "Comment construire un pipeline de déploiement Kubernetes robuste avec GitHub Actions : build, scan, déploiement progressif, et rollback automatique. Zéro compromis sur la sécurité."
tags: ["CI/CD", "kubernetes", "github-actions", "devops"]
---

Après avoir vu une douzaine de pipelines "fonctionnels mais fragiles" en entreprise, j'ai décidé d'écrire la version que j'aurais voulu avoir dès le départ.

## Architecture du pipeline

```
PR ouverte → lint + tests unitaires
PR mergée (main) → build image → scan sécurité → push → déploiement staging
Tag v* → déploiement production avec canary
```

## Structure du repo

```
.github/
  workflows/
    ci.yml           # Tests + lint
    cd-staging.yml   # Deploy automatique sur staging
    cd-production.yml # Deploy production sur tag
  actions/
    deploy/          # Action composite réutilisable
k8s/
  base/              # Kustomize base
  overlays/
    staging/
    production/
```

## Workflow CI (tests)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  build-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify Docker build
        run: docker build --target builder -t test-build .
```

## Workflow CD vers staging

```yaml
# .github/workflows/cd-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      security-events: write
    
    outputs:
      image-digest: ${{ steps.build.outputs.digest }}
      image-tag: ${{ steps.meta.outputs.tags }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
      
      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      # Scan de sécurité sur l'image buildée
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}@${{ steps.build.outputs.digest }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'  # Fail le pipeline si CRITICAL trouvé
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBECONFIG_STAGING }}" | base64 -d > ~/.kube/config
          chmod 600 ~/.kube/config
      
      - name: Deploy with Kustomize
        run: |
          cd k8s/overlays/staging
          kustomize edit set image app=${{ needs.build-and-push.outputs.image-tag }}
          kubectl apply -k .
      
      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/app -n staging --timeout=5m
      
      - name: Smoke test
        run: |
          sleep 10
          STATUS=$(curl -sf https://staging.example.com/health | jq -r '.status')
          [ "$STATUS" = "ok" ] || exit 1
```

## Rollback automatique

```yaml
      - name: Rollback on failure
        if: failure()
        run: |
          kubectl rollout undo deployment/app -n staging
          echo "::error::Deploy failed — rolled back to previous version"
```

## Sécuriser les secrets

```bash
# Encoder le kubeconfig pour GitHub Secrets
cat ~/.kube/config | base64 | pbcopy
# → coller dans Settings > Secrets > KUBECONFIG_STAGING
```

Et dans la config kubeconfig, utiliser un **ServiceAccount dédié** avec RBAC minimal :

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: staging
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "patch", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch"]
```

## Ce que j'aurais ajouté dès le départ

1. **Scan de secrets** dans le code (`gitleaks` ou `trufflesecurity`)
2. **SBOM** automatique avec chaque release
3. **Notifications Slack** sur échec de déploiement prod
4. **Smoke tests plus robustes** — pas juste un `/health`

> Le meilleur pipeline est celui que votre équipe peut debugger à 3h du matin. Gardez-le lisible.
