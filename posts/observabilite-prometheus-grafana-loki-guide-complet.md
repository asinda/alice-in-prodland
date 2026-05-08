---
title: "Monitoring ≠ Observabilité : construire la stack Prometheus + Grafana + Loki + Tempo"
date: "2026-04-28"
excerpt: "Tout le monde dit 'on a Grafana, donc on est observables'. Faux. Voici la différence réelle entre monitoring et observabilité, et comment construire une vraie stack des trois pilliers — métriques, logs, traces — avec les outils open source."
tags: ["observabilité", "prometheus", "grafana", "SRE", "kubernetes", "devops"]
---

La phrase que j'entends le plus souvent lors des audits d'infrastructure : "on a Grafana, donc on a de l'observabilité". C'est faux, et la différence n'est pas sémantique — elle change ce qu'on est capable de faire pendant un incident.

## Monitoring vs Observabilité — la vraie différence

Le **monitoring** répond à des questions pré-définies :
- CPU > 80% ?
- Error rate > 1% ?
- Pod en CrashLoopBackOff ?

Ces questions, tu les as anticipées **avant** l'incident. Tu as créé les alertes. Si quelque chose de nouveau casse, quelque chose que tu n'avais pas prévu, le monitoring ne te dit rien.

L'**observabilité** répond à des questions ad-hoc que tu poses pendant l'incident :
- Pourquoi cette requête timeout pour cet utilisateur précis ?
- Qu'est-ce qui a changé entre 14h00 et 14h05 ?
- Quel service appelle quel autre service avec combien de latence ?

L'analogie que j'utilise en formation : le monitoring, c'est l'alarme incendie. Elle te dit qu'il y a un feu. L'observabilité, c'est la caméra qui te montre où est le feu, comment il s'est déclenché, et quel chemin il suit.

## Les trois pilliers

```
┌─────────────────────────────────────────────────────────────┐
│                     OBSERVABILITÉ                           │
├──────────────┬─────────────────┬───────────────────────────┤
│   MÉTRIQUES  │      LOGS       │         TRACES            │
│  Prometheus  │      Loki       │    Tempo / Jaeger         │
│              │                 │                           │
│  CPU, RAM    │  "ERROR 500 at  │  req → service A → B → C │
│  latence p99 │   14:03 user X" │  latence par span         │
│  taux d'err  │  stack traces   │  bottleneck exact         │
└──────────────┴─────────────────┴───────────────────────────┘
                        │
                        ▼
                    GRAFANA
           (visualisation unifiée de tout)
                        │
                        ▼
                ALERTMANAGER
         (email, Slack, PagerDuty, Teams)
```

### Pourquoi les trois ? Pas un seul ?

Chaque pillier répond à un type de question différent. Un incident réel demande les trois :

> **Alerte** : latence p99 > 2s sur `/api/orders` (Prometheus → Alertmanager)
>
> **Constat** : ça dure depuis 14h03, corrélé avec un déploiement (Métriques Grafana)
>
> **Cause** : les logs montrent `SQLException: connection pool exhausted` sur le service `order-service` (Loki)
>
> **Root cause** : la trace montre que `order-service` appelle `inventory-service` 47 fois par requête au lieu de 1 — régression dans le cache (Tempo)

Sans les traces, tu aurais cherché du côté DB pendant 45 minutes.

## Architecture de déploiement (Kubernetes)

```yaml
# architecture simplifiée
namespace: monitoring
  - prometheus (scrape toutes les métriques)
  - alertmanager (routing des alertes)
  - grafana (visualisation)
  - loki (aggregation des logs)
  - promtail (agent de collecte logs, sur chaque node)
  - tempo (backend de tracing)
  - otel-collector (OpenTelemetry Collector — normalisation des traces)
```

### Prometheus

Prometheus scrape des endpoints `/metrics` exposés par tes services. Il fonctionne en pull — c'est lui qui va chercher les métriques, pas tes services qui les poussent.

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Ne scraper que les pods annotés
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: (.+)
        replacement: ${1}:${2}
```

Règle absolue : **annoter tes pods** pour le scraping, pas de configuration statique. Quand tu as 200+ services, une liste statique est unmaintenable.

```yaml
# Dans ton Deployment
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
```

### Loki — Logs sans index

La différence architecturale de Loki vs Elasticsearch : **pas d'index sur le contenu des logs**. Loki n'indexe que les labels (namespace, pod, container, etc.). Le contenu est compressé et stocké brut.

Conséquence pratique : Loki est 10x moins cher à opérer que Elasticsearch pour du log storage. Mais les requêtes full-text sont plus lentes si tu n'as pas filtré par labels d'abord.

```logql
# LogQL — requête Loki
# Toujours filtrer par label D'ABORD, puis par contenu
{namespace="production", app="api-gateway"} 
  |= "ERROR" 
  | json 
  | line_format "{{.level}} {{.msg}}"
  | rate[5m]
```

**Piège classique :** faire une requête sur `{namespace="production"}` sans filtre supplémentaire sur des volumes importants. Tu vas scanner des Go de logs compressés. Ajoute toujours le label le plus sélectif d'abord.

### Tempo — Tracing distribué

Tempo est le backend de traces de Grafana Labs. Il est compatible OpenTelemetry, Zipkin, et Jaeger — tu n'as pas à choisir un format de tracing.

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/tempo]
```

Dans ton application (exemple Python) :

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317")
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

def get_order(order_id: str):
    with tracer.start_as_current_span("get_order") as span:
        span.set_attribute("order.id", order_id)
        # ... ta logique
```

## La corrélation — où ça devient de l'observabilité réelle

Prometheus, Loki et Tempo séparément, c'est encore du monitoring amélioré. Ce qui crée de l'observabilité réelle, c'est la **corrélation** entre les trois dans Grafana.

**Exemplified Logs** : dans une trace Tempo, cliquer sur un span ouvre directement les logs Loki correspondants pour ce service, à ce timestamp précis.

**Service Graph** : généré automatiquement depuis les traces, il montre les dépendances entre services et leurs latences P50/P95/P99.

**Alertes corrélées** : une alerte Prometheus peut pointer vers un dashboard Grafana qui affiche simultanément les métriques ET les logs du service en question.

```
[ALERTE] latence > 2s sur order-service
  └── Lien : Grafana dashboard → timeline incident
        ├── Métriques : spike de connexions DB à 14h03
        ├── Logs : "connection pool exhausted" → 47 occurrences
        └── Traces : span DB bloque 1.8s sur inventory-service
```

Cet enchaînement, sans chercher, sans croiser manuellement — c'est ça, l'observabilité opérationnelle.

## Ce qu'on a mis en place en production

Notre stack actuelle tourne sur Kubernetes avec :
- Prometheus Operator (CRDs pour la configuration déclarative)
- Loki en mode distributed (haute disponibilité, stockage objet S3)
- Tempo avec backend S3
- Grafana avec les datasources configurées via Terraform (pas de clic-clic)
- Alertes Prometheus → Alertmanager → Zoom Chat (via webhook custom)

La dernière partie — les alertes dans Zoom Chat — a augmenté notre MTTD (Mean Time To Detect) de 12 minutes à 3 minutes. Les équipes voient l'alerte là où elles travaillent déjà, pas dans un outil d'alerting que personne ne regarde.

---

*Si tu veux un guide détaillé sur le déploiement de cette stack sur Kubernetes avec Helm, c'est dans le cours Observabilité disponible sur le site.*
