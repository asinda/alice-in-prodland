---
title: "GitLab CI/CD Full IaC: Terraform + Ansible + DevSecOps integrated complete architecture"
excerpt: "How we built a GitLab pipeline that deploys Terraform infrastructure, configures servers with Ansible, scans images with Trivy, and generates an SBOM/SLSA without sacrificing dev speed."
translatedAt: "2026-08-08T07:21:12.705Z"
---

The subject constantly comes up in DevOps discussions: “we want to do IaC, but the pipelines are too slow” or “we added security scans and now no one is pushing anything anymore”. Here's how we solved both in production.

## Overall pipeline architecture

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

Absolute rule: **the pipeline must finish in < 12 minutes** on a regular MR, otherwise the devs bypass. We measured, established pipeline SLOs, and alerted on them as on any service.

## Stage 1: Lint & Validate (< 30 seconds)

The first internship must be dazzling. If we fail here, the dev fixes it in 30 seconds and pushes back.

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

The `rules: changes:` is fundamental, we only validate what has changed. On a monorepo with 20 teams, without this filter the pipeline runs for everyone on each commit.

## Stage 2: Terraform Plan with automatic MR comment

The Terraform plan is posted as a comment on the MR. Reviewers see exactly what will change without having to clone and launch the plan themselves.

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
        COMMENT="## Terraform Plan   ${CI_ENVIRONMENT_NAME}\n\`\`\`\n$(cat /tmp/plan.txt | tail -30)\n\`\`\`"
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

## Stage 3: DevSecOps Trivy, Vault, SBOM

This is where a lot of pipelines become slow. Our optimizations:

### Trivy with cache

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

**`--ignore-unfixed`** is non-negotiable in practice. CVEs without available fixes create noise and unjustified blockages. We alert on unfixed separately, asynchronously, not by blocking the pipeline.

### Secrets with HashiCorp Vault

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

Authentication is done via JWT (GitLab OIDC → Vault), zero static secrets in CI variables. GitLab's JWT token has a lifespan of 300 seconds, enough for the job, not enough to be exfiltrated.

### SBOM Generation

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

The SBOM is archived for 90 days, enough to respond to audits and trace the components in the event of a CVE discovered subsequently (Log4Shell case).

## Stage 4: Ansible on Staging

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

The double pass (`--check` then real) avoids unpleasant surprises. If the check fails, the job fails without deploying anything.

## Deploy Prod: protection by GitLab environment

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

The `when: manual` + protection of the GitLab environment (reviewers required) = double human validation before any infra change in prod. Approval is done in GitLab, with complete audit trail.

## What really accelerated the pipeline

| Optimization | Profit |
|---|---|
| Cache Trivy DB | -90s per job |
| `rules: changes:` per folder | -40% of useless jobs |
| Parallel matrix for multi-env | -3min on plans |
| Dedicated runner (no shared) | -1min scheduling |
| Pre-built Docker image with tools | -45s setup |

The total went from 28 minutes to 11 minutes on the full pipeline. The devs stopped complaining.

---

The complete template for this pipeline is available in the GitLab CI/CD Full IaC course.
