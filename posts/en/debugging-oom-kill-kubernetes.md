---
title: "Hunting an OOMKill at 2 a.m.: methodology and kubectl one-liners"
excerpt: "A pod that restarts every 5 minutes. Empty logs. A screaming pager. Here's how I tracked down and fixed an OOMKill in production without losing my mind."
translatedAt: "2026-08-08T07:21:08.757Z"
---

It's 2:17 a.m. My phone vibrates. PagerDuty alert: `CrashLoopBackOff` on the payment service. The kind of alert that wakes everyone up except the monster who caused it.

Here is how I solved this problem step by step.

## Step 1: Initial screening

The first command to run when a pod crashes:

```bash
kubectl get pods -n payments -l app=payment-svc --watch
```

We see the restarts piling up. Then:

```bash
kubectl describe pod -n payments -l app=payment-svc | grep -A5 "Last State"
```

The output reveals:

```
Last State:  Terminated
  Reason:    OOMKilled
  Exit Code: 137
  Started:   Wed, 15 Jan 2025 02:12:03 +0000
  Finished:  Wed, 15 Jan 2025 02:17:41 +0000
```

Exit code **137** = OOMKill. The container has exceeded its memory limit.

## Step 2: Understand memory consumption

```bash
# Consommation actuelle
kubectl top pods -n payments --sort-by=memory

# Voir les limits/requests configurées
kubectl get pod -n payments -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].resources}{"\n"}{end}'
```

Shocking result: `limits.memory: 256Mi` for a Java service. Someone had copied and pasted the config of a Go microservice without adjusting.

## Step 3: Analyze historical metrics

With Prometheus/Grafana, we look for the pattern:

```promql
container_memory_working_set_bytes{namespace="payments", container="payment-svc"}
/ container_spec_memory_limit_bytes{namespace="payments", container="payment-svc"}
```

The ratio has been close to 0.98 for 3 days. The JVM inflated its heap with each nighttime traffic peak.

## Step 4: Recover the logs before the crash

The logs of the crashed pod are no longer there but those of the previous container are:

```bash
kubectl logs -n payments -l app=payment-svc --previous --tail=200
```

We find the fatal lines:

```
java.lang.OutOfMemoryError: GC overhead limit exceeded
  at java.util.Arrays.copyOf(Arrays.java:3210)
  ...
```

## Step 5: Fix and validation

Memory limit patch:

```bash
kubectl patch deployment payment-svc -n payments --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"1Gi"},
       {"op":"replace","path":"/spec/template/spec/containers/0/resources/requests/memory","value":"512Mi"}]'
```

And added JVM flags to constrain the heap:

```yaml
env:
  - name: JAVA_OPTS
    value: "-Xms512m -Xmx768m -XX:+UseContainerSupport"
```

## Lessons learned

| Antipattern | Good practice |
|---|---|
| Copy and paste resource limits | Profile each service separately |
| Limits = Requests | Requests = p50 usage, Limits = p99 + margin |
| Ignore memory metrics | Alert at 80% of the limit |

> **Golden rule**: for the JVM in K8s, always use `-XX:+UseContainerSupport` (JDK 10+). Without this, the JVM sees the node's RAM, not the container's.

## Useful one-liners to keep

```bash
# Tous les pods OOMKilled du cluster
kubectl get pods -A -o json | jq '.items[] | select(.status.containerStatuses[]?.lastState.terminated.reason=="OOMKilled") | .metadata.name'

# Memory pressure par nœud
kubectl describe nodes | grep -A3 "Conditions:"

# Top consumers
kubectl top pods -A --sort-by=memory | head -20
```

2:47. The service is stable. I'm going back to bed.
