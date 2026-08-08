---
title: "MongoDB Ops Manager HA in production: replica sets, sharding and PBM what we don't tell you"
excerpt: "18 months operating MongoDB 8.0 with Ops Manager on a mission-critical PaaS platform. Here are the real architectural decisions, the pitfalls of sharding, and why PBM replaced mongodump in our backup strategy."
translatedAt: "2026-08-08T07:21:17.142Z"
---

When I was given responsibility for the MongoDB platform in production, the cluster was running standalone with `mongodump` backups planned via cron. Functional. Fragile. Not scalable.

18 months later: multi-AZ replica sets, sharding on critical collections, Ops Manager 8.0 with complete automation, and PBM for consistent millisecond backups. Here's what I learned.

## Why Ops Manager rather than Cloud Manager

The question comes up often. For an on-premises hosted PaaS platform with data sovereignty constraints, Cloud Manager (SaaS Mongo Atlas) was not an option. Ops Manager is installed internally, manages deployment automation, rolling updates, backups, and alerts from a centralized interface.

What the doc doesn't say: **Ops Manager itself must be highly available**. We started with a standalone Ops Manager, and this was the first point of failure that we corrected. The final architecture:

```
Ops Manager (3 nœuds actif/passif/arbitre)
    └── Application Database : MongoDB 3-node replica set dédié
    └── Backup Daemon : 2 instances avec stockage S3-compatible
```

## Replica Sets: the parameters that change everything in production

The default deployment of a replica set works. In production, there are three parameters that we systematically adjust.

**`oplogSizeMB`** By default, the oplog is 5% of disk space or 1GB. On write-intensive workloads (our case with OpenSearch), an oplog that is too small causes secondary lag and then complete resynchronization. We set it to 50GB.

**`votes` and `priority`** In a multi-AZ deployment with two datacenters, we add an arbiter in a third site. The referee does not store data but participates in the election. Warning: an arbiter with `votes: 1` can block an election if the two main DCs lose connectivity between them. We use `priority: 0` on the secondary of the secondary DC to force promotion to the correct DC.

**`readPreference`** On analytics requests and exports, we route to `secondaryPreferred`. This relieves the primary and the analytics latencies go from 2-3s to 400-500ms.

```javascript
// Connection string pour l'analytique
mongodb://user:pass@primary:27017,sec1:27017,sec2:27017/db
  ?replicaSet=rs0
  &readPreference=secondaryPreferred
  &readPreferenceTags=dc:secondary
```

## Sharding: when and how

We didn't shard right away. **Premature sharding is the classic error** it adds operational complexity (mongos, config servers) without benefit on collections < 50GB.

We sharded when two conditions were met:
1. A collection exceeded 100GB with slow queries despite indexes
2. The access patterns were clear (no scatter-gather on the shard key)

The choice of the shard key is critical and irreversible (before MongoDB 5.0 at least). We opted for a **compound shard key** `{ tenantId: 1, createdAt: 1 }` rather than a hashized `_id`. Why:
- Queries almost always filter by `tenantId`
- Avoids scatter-gather in 90% of cases
- The distribution is balanced because the tenants have comparable volumes

```javascript
sh.shardCollection("proddb.events", { tenantId: 1, createdAt: 1 })
```

Classic trap: **jumbo chunks**. If a tenant generates 20% of the volume, its chunks can no longer be migrated. Solution: pre-split before loading, and `refineCollectionShardKey` in MongoDB 4.4+ to add a dimension.

## PBM (Percona Backup for MongoDB) vs mongodump

`mongodump` has two fundamental problems in production:

1. **Not consistent on a sharded cluster** each shard is dumped independently, cross-shard transactions are not atomic in the backup
2. **Not incremental** each backup is a full one, therefore slow and storage intensive

PBM solves both. It uses oplog to create **consistent point-in-time backups** across the entire cluster. Our setup:

```yaml
# pbm-config.yaml
storage:
  type: s3
  s3:
    region: fr-east-1
    bucket: mongo-backups-prod
    credentials:
      access-key-id: ${AWS_ACCESS_KEY}
      secret-access-key: ${AWS_SECRET_KEY}

backup:
  compression: pgzip
  compressionLevel: 6
```

**Planning:**
- Full backup: Sunday 02:00
- Oplog continuous shipping (PITR activated) restoration possible at any point in the last 7 days
- Retention: 4 fulls + oplog

To test the restoration (what everyone forgets to do):

```bash
# Restauration sur environnement de test, pas prod
pbm restore --time "2026-04-14T10:30:00" \
  --base-snapshot "2026-04-13T02:00:00.123456789Z"
```

We do a monthly automatic restoration test via a GitLab CI job which restores to the staging environment and checks the integrity of the data.

## Alerting: the metrics that really matter

Prometheus + Grafana collect metrics via `mongodb_exporter`. The alerts we have in production:

| Metric | Threshold | Reason |
|---|---|---|
| `mongodb_rs_members_health` | < 1 | Member down |
| `mongodb_rs_replication_lag_seconds` | > 30s | Secondary late |
| `mongodb_connections_current` | > 80% of max | Saturation connections |
| `mongodb_op_latencies_latency` (write) | p99 > 100ms | Performance issue |
| PBM backup status | != "done" after window | Backup failed |

The replication lag trap: an alert that goes off at 3 a.m. because of an index build in the background. Added an exception for current `createIndexes`.

## What we would do differently

**Ops Manager in Kubernetes**: we installed it on VMs. In hindsight, the MongoDB Enterprise Operator Kubernetes would have simplified lifecycle management. But the migration from Ops Manager to the K8s operator is non-trivial and is an ongoing project.

**Oplog monitoring** from the start: we had a resynchronization incident at 2 a.m. because the oplog window had fallen to 4 hours following a write spike. Now we alert at < 12 p.m. oplog window.

**Automated recovery tests**: we added it after the first real incident, not before. The backup test is worthless if you don't test the restoration.

---

If you are implementing MongoDB in production and have questions about architecture or sizing, comments are open.
