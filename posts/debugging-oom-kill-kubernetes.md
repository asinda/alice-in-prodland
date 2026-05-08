---
title: "Chasser un OOMKill à 2h du matin : méthodologie et kubectl one-liners"
date: "2025-01-15"
excerpt: "Un pod qui redémarre toutes les 5 minutes. Des logs vides. Un pager qui hurle. Voici comment j'ai traqué et corrigé un OOMKill en production sans perdre la tête."
tags: ["kubernetes", "debugging", "SRE", "OOM"]
---

Il est 2h17. Mon téléphone vibre. Alerte PagerDuty : `CrashLoopBackOff` sur le service de paiement. Le genre d'alerte qui réveille tout le monde sauf le monstre qui l'a causé.

Voici comment j'ai résolu ce problème étape par étape.

## Étape 1 : Triage initial

La première commande à lancer quand un pod crash :

```bash
kubectl get pods -n payments -l app=payment-svc --watch
```

On voit les restarts s'accumuler. Ensuite :

```bash
kubectl describe pod -n payments -l app=payment-svc | grep -A5 "Last State"
```

La sortie révèle :

```
Last State:  Terminated
  Reason:    OOMKilled
  Exit Code: 137
  Started:   Wed, 15 Jan 2025 02:12:03 +0000
  Finished:  Wed, 15 Jan 2025 02:17:41 +0000
```

Code de sortie **137** = OOMKill. Le conteneur a dépassé sa limite mémoire.

## Étape 2 : Comprendre la consommation mémoire

```bash
# Consommation actuelle
kubectl top pods -n payments --sort-by=memory

# Voir les limits/requests configurées
kubectl get pod -n payments -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources}{"\n"}{end}'
```

Résultat choquant : `limits.memory: 256Mi` pour un service Java. Quelqu'un avait copié-collé la config d'un microservice Go sans ajuster.

## Étape 3 : Analyser les métriques historiques

Avec Prometheus/Grafana, on cherche le pattern :

```promql
container_memory_working_set_bytes{namespace="payments", container="payment-svc"}
/ container_spec_memory_limit_bytes{namespace="payments", container="payment-svc"}
```

Le ratio frôlait 0.98 depuis 3 jours. La JVM gonflait son heap à chaque pic de trafic nocturne.

## Étape 4 : Récupérer les logs avant le crash

Les logs du pod crashé ne sont plus là — mais ceux du conteneur précédent oui :

```bash
kubectl logs -n payments -l app=payment-svc --previous --tail=200
```

On trouve les lignes fatales :

```
java.lang.OutOfMemoryError: GC overhead limit exceeded
  at java.util.Arrays.copyOf(Arrays.java:3210)
  ...
```

## Étape 5 : Fix et validation

Patch de la limite mémoire :

```bash
kubectl patch deployment payment-svc -n payments --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"1Gi"},
       {"op":"replace","path":"/spec/template/spec/containers/0/resources/requests/memory","value":"512Mi"}]'
```

Et ajout des flags JVM pour contraindre le heap :

```yaml
env:
  - name: JAVA_OPTS
    value: "-Xms512m -Xmx768m -XX:+UseContainerSupport"
```

## Leçons retenues

| Antipattern | Bonne pratique |
|---|---|
| Copier-coller les resource limits | Profiler chaque service séparément |
| Limits = Requests | Requests = p50 usage, Limits = p99 + marge |
| Ignorer les métriques mémoire | Alerter à 80% de la limit |

> **Règle d'or** : pour la JVM dans K8s, toujours utiliser `-XX:+UseContainerSupport` (JDK 10+). Sans ça, la JVM voit la RAM du nœud, pas celle du conteneur.

## One-liners utiles à garder

```bash
# Tous les pods OOMKilled du cluster
kubectl get pods -A -o json | jq '.items[] | select(.status.containerStatuses[]?.lastState.terminated.reason=="OOMKilled") | .metadata.name'

# Memory pressure par nœud
kubectl describe nodes | grep -A3 "Conditions:"

# Top consumers
kubectl top pods -A --sort-by=memory | head -20
```

2h47. Le service est stable. Je retourne me coucher.
