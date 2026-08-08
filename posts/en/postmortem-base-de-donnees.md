---
title: "Post-mortem: 4 hours of unavailability due to a missing index"
excerpt: "How a seemingly innocuous database migration caused 4 hours of service degradation, and what we changed to make sure it never happens again."
translatedAt: "2026-08-08T07:21:23.660Z"
---

**Severity**: P1  
**Duration**: 4h12 (14:33 → 18:45 UTC)  
**Impacted services**: main API, customer portal  
**Users affected**: ~12,000

---

## Summary

A migration adding a new `tenant_id` column to a 45M row table generated a 7 second table lock, causing a cascade of timeouts and saturating the connection pool. Recovery took 4 hours due to a missing index on the new column, not detected before going live.

---

## Timeline

| UTC time | Event |
|---|---|
| 2:30 p.m. | Start of v4.8.2 deployment |
| 14:33 | Alert: p99 latency > 5s on `/api/orders` |
| 14:36 ​​| PagerDuty triggered, team mobilized |
| 14:41 | Rollback of deployed code → no improvement |
| 15:02 | Identification of migration as a probable cause |
| 15:15 | Analysis: lock lifted but queries still slow |
| 15:40 | Discovered missing index on `tenant_id` |
| 16:10 | Creation of the `CONCURRENTLY` index (2 hours estimated) |
| 18:45 | Index created, latencies returned to normal |

---

## Root cause

### What happened

The `20250302_add_tenant_id.sql` migration:

```sql
ALTER TABLE orders ADD COLUMN tenant_id UUID;
UPDATE orders SET tenant_id = '...'; -- default value pour 45M lignes
ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL;
```

In PostgreSQL < 14, `ALTER TABLE ADD COLUMN` with `DEFAULT` locks the table while writing the value to all rows. Here: 7 seconds of exclusive lock on 45M lines.

### Why the index was missing

The application code systematically filters by `tenant_id`. Without index, each query does a sequential scan on 45M lines. With 200 req/s, the connection pool (20 connections max) found itself saturated in a few seconds.

```sql
-- La requête la plus fréquente, sans index :
EXPLAIN ANALYZE SELECT * FROM orders WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50;

-- Résultat : Seq Scan on orders (cost=0.00..890234.56 rows=12 width=384)
--            Actual time: 4231.456..4245.123 ms
```

### Why did it go to production

1. The staging environment only had 50k lines and the query took 12ms.
2. The migration review did not have a formal checklist.
3. No post-migration load testing.

---

## What we changed

### Short term

- Added missing index (done during the incident)
- Monitoring of `pg_stat_user_tables.seq_scan` to detect sequential scans

### Medium term

**1. Mandatory migration review checklist**

```markdown
## Checklist avant toute migration
- [ ] Volume de données en prod estimé
- [ ] Lock duration estimée et acceptable ?
- [ ] Indexes nécessaires créés AVANT la migration ?
- [ ] Plan de rollback testé
- [ ] Communication aux équipes dépendantes
```

**2. Safe migration template for large tables**

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

**3. Staging with real-size data**

We anonymize and load a production dump (10% by default, 100% for critical migrations).

---

## What we will never do again

> "The fact that it works in staging doesn't mean anything if staging doesn't have the same order of magnitude of data as prod."

---

## Impact Metrics

- **Monthly SLA**: 99.97% → 99.42% (broken SLA)
- **Failed requests**: ~2.3M
- **Estimated income impacted**: confidential

---

## References

- [Zero-downtime migrations with PostgreSQL](https://gist.github.com/jcoleman/1e6ad1bf8de454c166da)  
- [PostgreSQL: ALTER TABLE and locking](https://www.postgresql.org/docs/current/sql-altertable.html)
