---
title: "MongoDB Ops Manager HA en production : replica sets, sharding et PBM — ce qu'on ne vous dit pas"
date: "2026-04-14"
excerpt: "18 mois à opérer MongoDB 8.0 avec Ops Manager sur une plateforme PaaS critique. Voici les vraies décisions d'architecture, les pièges du sharding, et pourquoi PBM a remplacé mongodump dans notre stratégie de backup."
tags: ["mongodb", "devops", "SRE", "kubernetes", "databases"]
---

Quand on m'a confié la responsabilité de la plateforme MongoDB en production, le cluster tournait en standalone avec des backups `mongodump` planifiés via cron. Fonctionnel. Fragile. Pas scalable.

18 mois plus tard : replica sets multi-AZ, sharding sur les collections critiques, Ops Manager 8.0 avec automation complète, et PBM pour des backups cohérents à la milliseconde. Voici ce que j'ai appris.

## Pourquoi Ops Manager plutôt que Cloud Manager

La question revient souvent. Pour une plateforme PaaS hébergée on-premise avec des contraintes de souveraineté des données, Cloud Manager (SaaS Mongo Atlas) n'était pas une option. Ops Manager s'installe en interne, gère l'automatisation des déploiements, les mises à jour rolling, les backups, et les alertes depuis une interface centralisée.

Ce que la doc ne dit pas : **Ops Manager lui-même doit être hautement disponible**. On a commencé avec un Ops Manager standalone, et c'est le premier point de défaillance qu'on a corrigé. L'architecture finale :

```
Ops Manager (3 nœuds actif/passif/arbitre)
    └── Application Database : MongoDB 3-node replica set dédié
    └── Backup Daemon : 2 instances avec stockage S3-compatible
```

## Replica Sets : les paramètres qui changent tout en production

Le déploiement par défaut d'un replica set fonctionne. En production, il y a trois paramètres qu'on ajuste systématiquement.

**`oplogSizeMB`** — Par défaut, l'oplog fait 5% de l'espace disque ou 1GB. Sur des workloads d'écriture intensive (notre cas avec OpenSearch), un oplog trop petit provoque des secondary lag puis une resynchronisation complète. On a fixé à 50GB.

**`votes` et `priority`** — Dans un déploiement multi-AZ avec deux datacenters, on ajoute un arbitre dans un troisième site. L'arbitre ne stocke pas de données mais participe à l'élection. Attention : un arbitre avec `votes: 1` peut bloquer une élection si les deux DCs principaux perdent la connectivité entre eux. On utilise `priority: 0` sur le secondary du DC secondaire pour forcer la promotion dans le bon DC.

**`readPreference`** — Sur les requêtes analytics et les exports, on route vers `secondaryPreferred`. Ça soulage le primary et les latences analytics passent de 2-3s à 400-500ms.

```javascript
// Connection string pour l'analytique
mongodb://user:pass@primary:27017,sec1:27017,sec2:27017/db
  ?replicaSet=rs0
  &readPreference=secondaryPreferred
  &readPreferenceTags=dc:secondary
```

## Sharding : quand et comment

On n'a pas shardé tout de suite. **Le sharding prématuré est l'erreur classique** — il ajoute de la complexité opérationnelle (mongos, config servers) sans bénéfice sur des collections < 50GB.

On a shardé quand deux conditions étaient réunies :
1. Une collection dépassait 100GB avec des requêtes lentes malgré les index
2. Les patterns d'accès étaient clairs (pas de scatter-gather sur la shard key)

Le choix de la shard key est critique et irréversible (avant MongoDB 5.0 au moins). On a opté pour une **compound shard key** `{ tenantId: 1, createdAt: 1 }` plutôt qu'un `_id` hashlisé. Pourquoi :
- Les requêtes filtrent presque toujours par `tenantId`
- Évite le scatter-gather sur 90% des cas
- La distribution est équilibrée car les tenants ont des volumes comparables

```javascript
sh.shardCollection("proddb.events", { tenantId: 1, createdAt: 1 })
```

Piège classique : les **jumbo chunks**. Si un tenant génère 20% du volume, ses chunks ne peuvent plus être migrés. Solution : pré-split avant chargement, et `refineCollectionShardKey` en MongoDB 4.4+ pour ajouter une dimension.

## PBM (Percona Backup for MongoDB) vs mongodump

`mongodump` a deux problèmes fondamentaux en production :

1. **Pas cohérent sur un cluster shardé** — chaque shard est dumpé indépendamment, les transactions cross-shards ne sont pas atomiques dans le backup
2. **Pas incrémental** — chaque backup est un full, donc lent et gourmand en stockage

PBM résout les deux. Il utilise l'oplog pour créer des **backups point-in-time cohérents** sur l'ensemble du cluster. Notre configuration :

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

**Planification :**
- Full backup : dimanche 02h00
- Oplog shipping en continu (PITR activé) — restauration possible à n'importe quel point dans les 7 derniers jours
- Rétention : 4 fulls + oplog

Pour tester la restauration (ce que tout le monde oublie de faire) :

```bash
# Restauration sur environnement de test, pas prod
pbm restore --time "2026-04-14T10:30:00" \
  --base-snapshot "2026-04-13T02:00:00.123456789Z"
```

On fait un test de restauration mensuel en automatique via un job GitLab CI qui restaure sur l'env de staging et vérifie l'intégrité des données.

## Alerting : les métriques qui comptent vraiment

Prometheus + Grafana collectent les métriques via `mongodb_exporter`. Les alertes qu'on a en production :

| Métrique | Seuil | Raison |
|---|---|---|
| `mongodb_rs_members_health` | < 1 | Member down |
| `mongodb_rs_replication_lag_seconds` | > 30s | Secondary en retard |
| `mongodb_connections_current` | > 80% du max | Saturation connexions |
| `mongodb_op_latencies_latency` (write) | p99 > 100ms | Problème de performance |
| PBM backup status | != "done" après fenêtre | Backup raté |

Le piège du replication lag : une alerte qui se déclenche à 3h du matin à cause d'un index build en background. On a ajouté une exception pour les `createIndexes` en cours.

## Ce qu'on referait différemment

**Ops Manager en Kubernetes** : on l'a installé sur VMs. En rétrospective, le MongoDB Enterprise Operator Kubernetes aurait simplifié la gestion du cycle de vie. Mais la migration d'Ops Manager vers l'opérateur K8s est non triviale — c'est un projet en cours.

**Monitoring de l'oplog** dès le début : on a eu un incident de resynchronisation à 2h du matin parce que l'oplog window était tombée à 4 heures suite à un spike d'écritures. Maintenant on alerte à < 12h d'oplog window.

**Tests de restauration automatisés** : on l'a ajouté après le premier vrai incident, pas avant. Le test de backup ne vaut rien si on ne teste pas la restauration.

---

Si tu mets en place MongoDB en production et que tu as des questions sur l'architecture ou le sizing, les commentaires sont ouverts.
