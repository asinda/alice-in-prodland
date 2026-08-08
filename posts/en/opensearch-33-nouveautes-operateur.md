---
title: "OpenSearch 3.3: what it changes for a platform operator"
excerpt: "I have been operating OpenSearch in production for 3 years, first on the Airbus ELK platform, now on a PaaS platform. Here's what 3.3 actually changes for someone who manages clusters on a daily basis."
translatedAt: "2026-08-08T07:21:21.663Z"
---

When OpenSearch releases a minor, I read the release notes like I read a post-mortem: looking for what will affect me in production. 3.3 is released in early 2025 with several announcements. Here is my filter operator.

## The real change: Unified Discover (preview)

The new Discover interface brings together logs, metrics and traces in a single view. It seems cosmetic, but it changes the workflow in incident.

**Before (OpenSearch 2.x):** During a P1 incident, I was juggling between three different tabs Discover for logs, Metrics Analytics for timeseries, and Trace Analytics for distributed tracing. Sticking a mental timeline between the three is useless cognitive work under stress.

**After:** a single view, immediate visual correlation. If a latency spike appears on the metrics at 2:03 p.m., I can directly see the corresponding logs and traces without changing tabs.

The feature is in **preview** in 3.3, stable expected in 3.4. I activated it on our staging environment:

```yaml
# opensearch_dashboards.yml
newUX.enabled: true
discover.newUX: true
```

My verdict after 2 weeks: the interface is faster than the old Discover on 50GB+ indexes, probably thanks to optimizations on the query side. Some display bugs on nested fields, but nothing blocking.

## Multiple data sources finally usable

The _Multiple Data Sources_ feature has existed since 2.x, but it was fragile. 3.3 really stabilizes it.

In our architecture, we have three OpenSearch clusters:
- `prod-eu-west` production logs and metrics
- `staging-cluster` testing environment
- `archive-cluster` archived logs > 90 days

Previously, comparing an error in production with its context in staging required two separate Dashboards, two tabs, two connections. Now:

```json
// opensearch_dashboards.yml (data sources)
{
  "dataSources": [
    {
      "id": "prod",
      "title": "Production EU",
      "endpoint": "https://opensearch-prod.internal:9200",
      "auth": { "type": "username_password" }
    },
    {
      "id": "staging",
      "title": "Staging",
      "endpoint": "https://opensearch-staging.internal:9200"
    }
  ]
}
```

**Operational use case:** when a dev tells me "it works in staging but not in production", I create a comparative dashboard with the two sources side by side. It takes 3 minutes instead of 20.

**Current limitation:** alerts cannot yet aggregate across multiple sources. If you have a rule "alert if error 500 > X on all clusters", you must always create an alert per cluster. It’s on the roadmap.

## Apache Calcite as PPL engine impact on existing queries

PPL (Piped Processing Language) is OpenSearch's pipe-style query language. 3.3 migrates the engine to Apache Calcite.

```ppl
# Exemple PPL   unchanged syntax, faster execution
source=logs
| where level = "ERROR"
| stats count() by service
| sort -count()
| head 10
```

The syntax does not change, but performance on complex aggregations improves significantly. Our analytics queries that used to take 8-12 seconds are dropping to 3-5 seconds on our production indexes.

**Point of attention:** some non-standard PPL functions may behave differently with Calcite. Run your favorite query suite on staging before migrating. We had a case of `strftime()` returning a slightly different date format.

## Agentic AI not for tomorrow in production, but to be monitored

OpenSearch 3.3 exposes _agentic search_ and _agentic memory_ APIs to plug LLMs into your data.

```python
# Exemple : question en langage naturel sur vos logs
client.search(
    index="logs-prod",
    body={
        "query": {
            "neural": {
                "content": {
                    "query_text": "quelles erreurs sont apparues après le déploiement de 14h ?",
                    "model_id": "amazon.titan-embed-text-v1"
                }
            }
        }
    }
)
```

Honestly, I don't yet see how to integrate this into a mature operational on-call workflow. LLMs are mind-blowing, and in P1 incident you want facts, not probabilistic suggestions. But for non-critical analytics (understanding a performance bug after the fact, summarizing a week of logs), it has potential.

I am monitoring adoption over the next 6 months before testing in real conditions.

## What really interests me for 3.4

- **Discover in GA** (not just preview)
- **Multi-source alerts** (critical lack for multi-cluster architectures)
- **Snapshot Management** improved the current is functional but verbose to configure

OpenSearch continues to catch up with Elasticsearch in terms of features. On the workloads I operate (logs, metrics, traces), 3.3 is a solid update. Migration recommended upon validation in staging.

---

*I operate OpenSearch via Kubernetes on a PaaS platform in production. If you have any questions about K8s deployment or multi-cluster architecture, comments are open.*
