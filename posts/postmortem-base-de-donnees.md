---
title: "Post-mortem : 4h d'indisponibilité à cause d'un index manquant"
date: "2025-03-02"
excerpt: "Comment une migration de base de données apparemment anodine a causé 4 heures de dégradation de service, et ce qu'on a changé pour que ça n'arrive plus jamais."
tags: ["SRE", "postmortem", "postgresql", "incidents"]
---

**Sévérité** : P1  
**Durée** : 4h12 (14:33 → 18:45 UTC)  
**Services impactés** : API principale, portail client  
**Utilisateurs touchés** : ~12 000

---

## Résumé

Une migration ajoutant une nouvelle colonne `tenant_id` à une table de 45M de lignes a généré un verrou de table de 7 secondes, provoquant une cascade de timeouts et saturant le pool de connexions. La récupération a pris 4 heures en raison d'un index manquant sur la nouvelle colonne, non détecté avant la mise en production.

---

## Timeline

| Heure UTC | Événement |
|---|---|
| 14:30 | Début du déploiement v4.8.2 |
| 14:33 | Alerte : p99 latency > 5s sur `/api/orders` |
| 14:36 | PagerDuty déclenché, équipe mobilisée |
| 14:41 | Rollback du code déployé → pas d'amélioration |
| 15:02 | Identification de la migration comme cause probable |
| 15:15 | Analyse : verrou levé mais requêtes toujours lentes |
| 15:40 | Découverte de l'index manquant sur `tenant_id` |
| 16:10 | Création de l'index `CONCURRENTLY` (2h estimées) |
| 18:45 | Index créé, latences revenues à la normale |

---

## Cause racine

### Ce qui s'est passé

La migration `20250302_add_tenant_id.sql` :

```sql
ALTER TABLE orders ADD COLUMN tenant_id UUID;
UPDATE orders SET tenant_id = '...'; -- default value pour 45M lignes
ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
```

En PostgreSQL < 14, `ALTER TABLE ADD COLUMN` avec `DEFAULT` verrouille la table le temps d'écrire la valeur dans toutes les lignes. Ici : 7 secondes de verrou exclusif sur 45M lignes.

### Pourquoi l'index manquait

Le code applicatif filtre systématiquement par `tenant_id`. Sans index, chaque requête fait un sequential scan sur 45M lignes. Avec 200 req/s, le pool de connexions (20 connexions max) s'est retrouvé saturé en quelques secondes.

```sql
-- La requête la plus fréquente, sans index :
EXPLAIN ANALYZE SELECT * FROM orders WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50;

-- Résultat : Seq Scan on orders (cost=0.00..890234.56 rows=12 width=384)
--            Actual time: 4231.456..4245.123 ms
```

### Pourquoi c'est passé en prod

1. L'environnement de staging n'avait que 50k lignes — la requête y prenait 12ms.
2. La review de migration n'avait pas de checklist formelle.
3. Pas de test de charge post-migration.

---

## Ce qu'on a changé

### Court terme

- Ajout de l'index manquant (fait pendant l'incident)
- Monitoring de `pg_stat_user_tables.seq_scan` pour détecter les sequential scans

### Moyen terme

**1. Migration review checklist obligatoire**

```markdown
## Checklist avant toute migration
- [ ] Volume de données en prod estimé
- [ ] Lock duration estimée et acceptable ?
- [ ] Indexes nécessaires créés AVANT la migration ?
- [ ] Plan de rollback testé
- [ ] Communication aux équipes dépendantes
```

**2. Template de migration safe pour les grosses tables**

```sql
-- Pattern safe : backfill en batches
DO $$
DECLARE
  batch_size INT := 10000;
  offset_val INT := 0;
BEGIN
  LOOP
    UPDATE orders
    SET tenant_id = '...'
    WHERE id IN (
      SELECT id FROM orders
      WHERE tenant_id IS NULL
      LIMIT batch_size
    );
    EXIT WHEN NOT FOUND;
    PERFORM pg_sleep(0.1);
  END LOOP;
END $$;

-- Index CONCURRENTLY = pas de verrou de lecture
CREATE INDEX CONCURRENTLY idx_orders_tenant_id ON orders(tenant_id);

-- Contrainte NOT NULL en dernier
ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
```

**3. Staging avec données de taille réelle**

On anonymise et charge un dump de prod (10% par défaut, 100% pour les migrations critiques).

---

## Ce qu'on ne fera plus jamais

> "Le fait que ça marche en staging ne veut rien dire si staging n'a pas le même ordre de grandeur de données que prod."

---

## Métriques d'impact

- **SLA mensuel** : 99.97% → 99.42% (SLA brisé)
- **Requêtes échouées** : ~2.3M
- **Revenu estimé impacté** : confidentiel

---

## Références

- [Zero-downtime migrations with PostgreSQL](https://gist.github.com/jcoleman/1e6ad1bf8de454c166da)  
- [PostgreSQL: ALTER TABLE and locking](https://www.postgresql.org/docs/current/sql-altertable.html)
