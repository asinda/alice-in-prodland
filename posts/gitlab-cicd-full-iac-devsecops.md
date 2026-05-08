---
title: "GitLab CI/CD Full IaC : Terraform + Ansible + DevSecOps intégré — architecture complète"
date: "2026-03-20"
excerpt: "Comment on a construit un pipeline GitLab qui déploie de l'infra Terraform, configure les serveurs avec Ansible, scanne les images avec Trivy, et génère une SBOM/SLSA — sans sacrifier la vitesse des devs."
tags: ["CI_CD", "gitlab", "terraform", "ansible", "devops", "kubernetes"]
---

Le sujet revient constamment dans les discussions DevOps : "on veut faire de l'IaC, mais les pipelines sont trop lents" ou "on a ajouté les scans de sécurité et maintenant personne ne pousse plus rien". Voici comment on a résolu les deux en production.

## Architecture globale du pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    GitLab Pipeline                           │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│  lint &  │ terraform│ security │  ansible │    deploy       │
│  validate│  plan    │  scan    │  staging │    prod         │
└──────────┴──────────┴──────────┴──────────┴─────────────────┘
     │           │          │          │            │
  <30s        <2min      <3min      <5min      manuel (prod)
```

Règle absolue : **le pipeline doit finir en < 12 minutes** sur une MR ordinaire, sinon les devs contournent. On a mesuré, établi des SLOs de pipeline, et alerté dessus comme sur n'importe quel service.

## Stage 1 : Lint & Validate (< 30 secondes)

Le premier stage doit être fulgurant. Si on échoue ici, le dev corrige en 30 secondes et repousse.

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - plan
  - security
  - deploy-staging
  - deploy-prod

variables:
  TF_VERSION: "1.7.0"
  ANSIBLE_VERSION: "9.0.0"
  TF_ROOT: ${CI_PROJECT_DIR}/terraform
  ANSIBLE_ROOT: ${CI_PROJECT_DIR}/ansible

.terraform_base:
  image: hashicorp/terraform:${TF_VERSION}
  before_script:
    - terraform -chdir=${TF_ROOT} init -backend=false

tf:validate:
  extends: .terraform_base
  stage: validate
  script:
    - terraform -chdir=${TF_ROOT} validate
    - terraform -chdir=${TF_ROOT} fmt -check -recursive
  rules:
    - changes:
        - terraform/**/*

ansible:lint:
  image: cytopia/ansible-lint:latest
  stage: validate
  script:
    - ansible-lint ${ANSIBLE_ROOT}/playbooks/
  rules:
    - changes:
        - ansible/**/*
```

Le `rules: changes:` est fondamental — on ne valide que ce qui a changé. Sur un monorepo avec 20 équipes, sans ce filtre le pipeline tourne pour tout le monde à chaque commit.

## Stage 2 : Terraform Plan avec commentaire MR automatique

Le plan Terraform est posté en commentaire sur la MR. Les reviewers voient exactement ce qui va changer sans avoir à cloner et lancer le plan eux-mêmes.

```yaml
tf:plan:
  extends: .terraform_base
  stage: plan
  environment:
    name: staging
  script:
    - terraform -chdir=${TF_ROOT} init
    - terraform -chdir=${TF_ROOT} plan 
        -var-file="environments/${CI_ENVIRONMENT_NAME}.tfvars"
        -out=${TF_ROOT}/tfplan
        -no-color 2>&1 | tee /tmp/plan.txt
    - |
      # Post le plan en commentaire MR
      if [ -n "$CI_MERGE_REQUEST_IID" ]; then
        COMMENT="## Terraform Plan — ${CI_ENVIRONMENT_NAME}\n\`\`\`\n$(cat /tmp/plan.txt | tail -30)\n\`\`\`"
        curl -s --request POST \
          --header "PRIVATE-TOKEN: ${GITLAB_API_TOKEN}" \
          --data-urlencode "body=${COMMENT}" \
          "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes"
      fi
  artifacts:
    paths:
      - ${TF_ROOT}/tfplan
    expire_in: 1 hour
```

## Stage 3 : DevSecOps — Trivy, Vault, SBOM

C'est là que beaucoup de pipelines deviennent lents. Nos optimisations :

### Trivy avec cache

```yaml
security:trivy:
  image: aquasec/trivy:latest
  stage: security
  variables:
    TRIVY_CACHE_DIR: ${CI_PROJECT_DIR}/.trivycache
  cache:
    key: trivy-db
    paths:
      - ${CI_PROJECT_DIR}/.trivycache
  script:
    # Scan de l'image Docker buildée
    - trivy image
        --exit-code 1
        --severity HIGH,CRITICAL
        --ignore-unfixed
        --format json
        --output trivy-report.json
        ${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
    # Scan IaC Terraform
    - trivy config
        --exit-code 0
        --severity HIGH,CRITICAL
        ${TF_ROOT}/
  artifacts:
    reports:
      container_scanning: trivy-report.json
    paths:
      - trivy-report.json
    when: always
```

**`--ignore-unfixed`** est non négociable en pratique. Les CVE sans fix disponible créent du bruit et des blocages injustifiés. On alerte sur les unfixed séparément, en asynchrone, pas en bloquant le pipeline.

### Secrets avec HashiCorp Vault

```yaml
.vault_secrets:
  id_tokens:
    VAULT_ID_TOKEN:
      aud: https://vault.cegedim.internal
  secrets:
    DATABASE_PASSWORD:
      vault: secret/data/prod/mongodb@cegedim
      file: false
    ANSIBLE_VAULT_PASSWORD:
      vault: secret/data/ci/ansible@cegedim
      file: false
```

L'authentification se fait via JWT (GitLab OIDC → Vault), zéro secret statique dans les variables CI. Le token JWT de GitLab a une durée de vie de 300 secondes — assez pour le job, pas assez pour être exfiltré.

### Génération SBOM

```yaml
security:sbom:
  image: anchore/syft:latest
  stage: security
  script:
    - syft ${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
        --output cyclonedx-json=sbom.json
        --output spdx-json=sbom-spdx.json
  artifacts:
    paths:
      - sbom.json
      - sbom-spdx.json
    expire_in: 90 days
```

La SBOM est archivée 90 jours — assez pour répondre aux audits et tracer les composants en cas de CVE découverte a posteriori (cas Log4Shell).

## Stage 4 : Ansible sur Staging

```yaml
ansible:staging:
  image: cytopia/ansible:${ANSIBLE_VERSION}
  stage: deploy-staging
  environment:
    name: staging
  before_script:
    - echo "${ANSIBLE_VAULT_PASSWORD}" > /tmp/.vault_pass
    - eval $(ssh-agent -s)
    - echo "${SSH_PRIVATE_KEY}" | tr -d '\r' | ssh-add -
  script:
    - ansible-playbook
        --inventory ${ANSIBLE_ROOT}/inventories/staging/
        --vault-password-file /tmp/.vault_pass
        --diff
        --check  # dry-run d'abord
        ${ANSIBLE_ROOT}/playbooks/site.yml
    - ansible-playbook
        --inventory ${ANSIBLE_ROOT}/inventories/staging/
        --vault-password-file /tmp/.vault_pass
        --diff
        ${ANSIBLE_ROOT}/playbooks/site.yml
  after_script:
    - rm -f /tmp/.vault_pass
```

Le double passage (`--check` puis réel) évite les mauvaises surprises. Si le check échoue, le job échoue sans rien déployer.

## Deploy Prod : protection par environnement GitLab

```yaml
terraform:apply:prod:
  extends: .terraform_base
  stage: deploy-prod
  environment:
    name: production
  when: manual
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - terraform -chdir=${TF_ROOT} init
    - terraform -chdir=${TF_ROOT} apply
        -var-file="environments/production.tfvars"
        -auto-approve
        ${TF_ROOT}/tfplan
```

Le `when: manual` + protection de l'environnement GitLab (reviewers obligatoires) = double validation humaine avant tout changement infra en prod. L'approbation se fait dans GitLab, avec audit trail complet.

## Ce qui a vraiment accéléré le pipeline

| Optimisation | Gain |
|---|---|
| Cache Trivy DB | -90s par job |
| `rules: changes:` par dossier | -40% de jobs inutiles |
| Parallel matrix pour multi-env | -3min sur les plans |
| Runner dédié (pas de shared) | -1min de scheduling |
| Image Docker pré-buildée avec outils | -45s de setup |

Le total est passé de 28 minutes à 11 minutes sur le pipeline complet. Les devs ont arrêté de se plaindre.

---

Le template complet de ce pipeline est disponible dans le cours GitLab CI/CD Full IaC.
