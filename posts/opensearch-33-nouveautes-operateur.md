---
title: "OpenSearch 3.3 : ce que ça change pour un opérateur de plateforme"
date: "2026-05-05"
excerpt: "J'opère OpenSearch en production depuis 3 ans — d'abord sur la plateforme ELK d'Airbus, maintenant sur une plateforme PaaS. Voici ce que la 3.3 change concrètement pour quelqu'un qui gère des clusters au quotidien."
tags: ["opensearch", "devops", "SRE", "observabilité", "kubernetes"]
---

Quand OpenSearch sort une mineure, je lis les release notes comme je lis un post-mortem : en cherchant ce qui va me toucher en production. La 3.3 sort début 2025 avec plusieurs annonces. Voici mon filtre opérateur.

## Le vrai changement : Discover unifié (preview)

La nouvelle interface Discover regroupe logs, métriques et traces dans une seule vue. Ça semble cosmétique, mais ça change le flux de travail en incident.

**Avant (OpenSearch 2.x) :** pendant un incident P1, je jonglais entre trois onglets différents — Discover pour les logs, Metrics Analytics pour les timeseries, et Trace Analytics pour le tracing distribué. Coller une timeline mentale entre les trois, c'est du travail cognitif inutile sous stress.

**Après :** une seule vue, corrélation visuelle immédiate. Si une spike de latence apparaît sur les métriques à 14h03, je peux directement voir les logs et traces correspondantes sans changer d'onglet.

La fonctionnalité est en **preview** dans la 3.3, stable attendue en 3.4. Je l'ai activée sur notre environnement de staging :

```yaml
# opensearch_dashboards.yml
newUX.enabled: true
discover.newUX: true
```

Mon verdict après 2 semaines : l'interface est plus rapide que l'ancienne Discover sur des index de 50GB+, probablement grâce aux optimisations côté requêtage. Quelques bugs d'affichage sur les champs imbriqués, mais rien de bloquant.

## Sources de données multiples — enfin utilisable

La fonctionnalité _Multiple Data Sources_ existe depuis la 2.x, mais elle était fragile. La 3.3 la stabilise vraiment.

Dans notre architecture, on a trois clusters OpenSearch :
- `prod-eu-west` — logs et métriques de production
- `staging-cluster` — environnement de test
- `archive-cluster` — logs archivés > 90 jours

Avant, comparer une erreur en prod avec son contexte en staging nécessitait deux Dashboards séparés, deux onglets, deux connexions. Maintenant :

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

**Cas d'usage opérationnel :** quand un dev me remonte "ça marche en staging mais pas en prod", je crée un dashboard comparatif avec les deux sources côte à côte. Ça prend 3 minutes au lieu de 20.

**Limitation actuelle :** les alertes ne peuvent pas encore agréger sur plusieurs sources. Si vous avez une règle "alerter si erreur 500 > X sur tous les clusters", vous devez toujours créer une alerte par cluster. C'est sur la roadmap.

## Apache Calcite comme moteur PPL — impact sur les requêtes existantes

PPL (Piped Processing Language) est le langage de requête style pipe d'OpenSearch. La 3.3 migre le moteur vers Apache Calcite.

```ppl
# Exemple PPL — unchanged syntax, faster execution
source=logs
| where level = "ERROR"
| stats count() by service
| sort -count()
| head 10
```

La syntaxe ne change pas, mais les performances sur les agrégations complexes s'améliorent significativement. Nos requêtes d'analytics qui prenaient 8-12 secondes descendent à 3-5 secondes sur nos index de production.

**Point d'attention :** certaines fonctions PPL non-standard peuvent se comporter différemment avec Calcite. Faites tourner votre suite de requêtes favorites sur staging avant de migrer. On a eu un cas de `strftime()` qui retournait un format de date légèrement différent.

## L'IA agentique — pas pour demain en prod, mais à surveiller

OpenSearch 3.3 expose des APIs _agentic search_ et _agentic memory_ pour brancher des LLMs sur vos données.

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

Honnêtement, je ne vois pas encore comment intégrer ça dans un workflow on-call opérationnel mature. Les LLMs halluçinent, et en incident P1 vous voulez des faits, pas des suggestions probabilistes. Mais pour de l'analytics non-critique (comprendre un bug de perf après coup, résumer une semaine de logs), ça a du potentiel.

Je surveille l'adoption dans les 6 prochains mois avant de tester en conditions réelles.

## Ce qui m'intéresse vraiment pour la 3.4

- **Discover en GA** (pas juste preview)
- **Alertes multi-sources** (manque critique pour les architectures multi-clusters)
- **Snapshot Management** amélioré — le current est fonctionnel mais verbeux à configurer

OpenSearch continue de rattraper Elasticsearch en termes de fonctionnalités. Sur les workloads que j'opère (logs, métriques, traces), la 3.3 est une mise à jour solide. Migration recommandée dès validation en staging.

---

*J'opère OpenSearch via Kubernetes sur une plateforme PaaS en production. Si tu as des questions sur le déploiement K8s ou l'architecture multi-cluster, les commentaires sont ouverts.*
