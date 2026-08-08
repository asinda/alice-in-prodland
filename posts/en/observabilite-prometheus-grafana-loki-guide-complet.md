---
title: "Monitoring ≠ Observability: building the Prometheus + Grafana + Loki + Tempo stack"
excerpt: "Everyone says 'we have Grafana, so we are watchable'. Fake. Here is the real difference between monitoring and observability, and how to build a real stack of the three pillars of metrics, logs, traces with open source tools."
translatedAt: "2026-08-08T07:21:20.501Z"
---

The phrase I hear most often during infrastructure audits: “we have Grafana, so we have observability”. This is false, and the difference is not semantic, it changes what we are capable of doing during an incident.

## Monitoring vs Observability the real difference

**monitoring** answers pre-defined questions:
- CPU > 80%?
- Error rate > 1%?
- Pod in CrashLoopBackOff?

You anticipated these questions **before** the incident. You created the alerts. If something new breaks, something you didn't anticipate, monitoring doesn't tell you anything.

**Observability** answers ad-hoc questions that you ask during the incident:
- Why this timeout request for this specific user?
- What changed between 2:00 p.m. and 2:05 p.m.?
- Which service calls which other service with how much latency?

The analogy I use in training: monitoring is the fire alarm. She tells you there is a fire. Observability is the camera that shows you where the fire is, how it started, and what path it follows.

## The three pillars

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

### Why all three? Not just one?

Each pillar answers a different type of question. A real incident requires all three:

> **Alert**: p99 latency > 2s on `/api/orders` (Prometheus → Alertmanager)
>
> **Observation**: it has been going on since 2:03 p.m., correlated with a deployment (Grafana Metrics)
>
> **Cause**: the logs show `SQLException: connection pool exhausted` on the `order-service` service (Loki)
>
> **Root cause**: the trace shows that `order-service` calls `inventory-service` 47 times per request instead of 1 regression in the cache (Tempo)

Without the traces, you would have searched on the DB side for 45 minutes.

## Deployment architecture (Kubernetes)

```yaml
# architecture simplifiée
namespace: monitoring
  - prometheus (scrape toutes les métriques)
  - alertmanager (routing des alertes)
  - grafana (visualisation)
  - loki (aggregation des logs)
  - promtail (agent de collecte logs, sur chaque node)
  - tempo (backend de tracing)
  - otel-collector (OpenTelemetry Collector   normalisation des traces)
```

### Prometheus

Prometheus scrapes `/metrics` endpoints exposed by your services. It works in pull mode; it is he who fetches the metrics, not your services which push them.

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

Absolute rule: **annotate your pods** for scraping, no static configuration. When you have 200+ services, a static list is unmaintainable.

```yaml
# Dans ton Deployment
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"
    prometheus.io/path: "/metrics"
```

### Loki Logs without index

The architectural difference of Loki vs Elasticsearch: **no index on log content**. Loki only indexes labels (namespace, pod, container, etc.). The content is compressed and stored raw.

Practical consequence: Loki is 10x cheaper to operate than Elasticsearch for log storage. But full-text queries are slower if you haven't filtered by labels first.

```logql
# LogQL   requête Loki
# Toujours filtrer par label D'ABORD, puis par contenu
{namespace="production", app="api-gateway"} 
  |= "ERROR" 
  | json 
  | line_format "{{.level}} {{.msg}}"
  | rate[5m]
```

**Classic trap:** make a query on `{namespace="production"}` without additional filter on large volumes. You will scan GB of compressed logs. Always add the most selective label first.

### Distributed Tempo Tracing

Tempo is the trace backend from Grafana Labs. It is OpenTelemetry, Zipkin, and Jaeger compatible so you don't have to choose a tracing format.

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

In your application (Python example):

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

## Correlation where it becomes real observability

Prometheus, Loki and Tempo separately, it's still improved monitoring. What creates real observability is the **correlation** between the three in Grafana.

**Exemplified Logs**: in a Tempo trace, clicking on a span directly opens the corresponding Loki logs for this service, at this precise timestamp.

**Service Graph**: automatically generated from the traces, it shows the dependencies between services and their P50/P95/P99 latencies.

**Correlated alerts**: a Prometheus alert can point to a Grafana dashboard which simultaneously displays the metrics AND logs of the service in question.

```
[ALERTE] latence > 2s sur order-service
  └── Lien : Grafana dashboard → timeline incident
        ├── Métriques : spike de connexions DB à 14h03
        ├── Logs : "connection pool exhausted" → 47 occurrences
        └── Traces : span DB bloque 1.8s sur inventory-service
```

This sequence, without searching, without manually crossing, that's operational observability.

## What we implemented in production

Our current stack runs on Kubernetes with:
- Prometheus Operator (CRDs for declarative configuration)
- Loki in distributed mode (high availability, S3 object storage)
- Tempo with S3 backend
- Grafana with data sources configured via Terraform (no click-click)
- Prometheus alerts → Alertmanager → Zoom Chat (via custom webhook)

The last part alerts in Zoom Chat increased our MTTD (Mean Time To Detect) from 12 minutes to 3 minutes. Teams see the alert where they already work, not in an alerting tool that no one looks at.

---

*If you want a detailed guide on deploying this stack on Kubernetes with Helm, it's in the Observability course available on the site.*
