---
title: "CI/CD to Kubernetes with GitHub Actions: the pipeline I wish I had from the start"
excerpt: "How to build a robust Kubernetes deployment pipeline with GitHub Actions: build, scan, progressive deployment, and automatic rollback. Zero compromise on security."
translatedAt: "2026-08-08T07:21:10.871Z"
---

After seeing a dozen "functional but fragile" pipelines in business, I decided to write the version I would have wanted to have from the start.

## Pipeline architecture

```
PR ouverte → lint + tests unitaires
PR mergée (main) → build image → scan sécurité → push → déploiement staging
Tag v* → déploiement production avec canary
```

## Repo structure

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

## CI workflow (testing)

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

## CD to staging workflow

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

## Automatic rollback

```yaml
      - name: Rollback on failure
        if: failure()
        run: |
          kubectl rollout undo deployment/app -n staging
          echo "::error::Deploy failed   rolled back to previous version"
```

## Secure secrets

```bash
# Encoder le kubeconfig pour GitHub Secrets
cat ~/.kube/config | base64 | pbcopy
# → coller dans Settings > Secrets > KUBECONFIG_STAGING
```

And in the kubeconfig config, use a **dedicated ServiceAccount** with minimal RBAC:

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

## What I would have added from the start

1. **Scan for secrets** in the code (`gitleaks` or `trufflesecurity`)
2. Automatic **SBOM** with each release
3. **Slack notifications** on prod deployment failure
4. **Smoke more robust tests** not just a `/health`

> The best pipeline is the one your team can debug at 3 a.m. Keep it readable.
