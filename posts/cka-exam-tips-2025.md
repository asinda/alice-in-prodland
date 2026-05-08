---
title: "CKA 2025 : ce que j'aurais voulu savoir avant de passer l'examen"
date: "2025-04-10"
excerpt: "J'ai passé la CKA en mars 2025 avec un score de 91%. Voici mes vraies notes de préparation : les pièges, les tricks de vitesse, et les domaines où les gens perdent du temps."
tags: ["kubernetes", "CKA", "certification", "career"]
---

Score final : **91%**. Temps restant : 8 minutes sur 120. Voici ce que j'aurais voulu savoir.

## Format de l'examen (2025)

- **17 tâches pratiques** dans un environnement terminal réel
- **120 minutes** (oui, c'est court)
- **Score minimum** : 66%
- **Documentation autorisée** : kubernetes.io/docs uniquement
- **Poids des domaines** :

| Domaine | Poids |
|---|---|
| Storage | 10% |
| Troubleshooting | 30% |
| Workloads & Scheduling | 15% |
| Cluster Architecture | 25% |
| Services & Networking | 20% |

## Préparer son environnement de travail

Première chose à faire au début de l'examen :

```bash
# Alias
alias k=kubectl
export do="--dry-run=client -o yaml"
export now="--grace-period=0 --force"

# Auto-complétion
source <(kubectl completion bash)
complete -F __start_kubectl k
```

Ces 4 lignes vous feront gagner 15-20 minutes sur l'examen.

## Les commandes impératives (ne pas générer du YAML à la main)

```bash
# Pod
k run nginx --image=nginx $do > pod.yaml

# Deployment
k create deployment app --image=nginx --replicas=3 $do > deploy.yaml

# Service (expose un deployment)
k expose deployment app --port=80 --target-port=8080 --type=ClusterIP $do > svc.yaml

# ConfigMap
k create configmap myconfig --from-literal=key=value $do

# Secret
k create secret generic mysecret --from-literal=password=s3cr3t $do

# ServiceAccount
k create serviceaccount mysa -n mynamespace $do

# Role + RoleBinding en une commande
k create role pod-reader --verb=get,list,watch --resource=pods $do
k create rolebinding pod-reader-binding --role=pod-reader --user=alice $do
```

## Domaine 1 : Troubleshooting (30% — le plus important)

C'est là que se gagne ou se perd l'examen. Les scénarios typiques :

### Pod qui ne démarre pas

```bash
k describe pod <name>    # Regarder Events
k logs <pod>             # Logs du conteneur
k logs <pod> --previous  # Logs avant le dernier crash
```

### Node NotReady

```bash
k describe node <name>   # Conditions, events
ssh <node>               # Si accès possible
systemctl status kubelet
journalctl -u kubelet -n 50
```

### Problème réseau

```bash
# Vérifier que les endpoints existent
k get endpoints <service>

# Tester la résolution DNS
k run test --rm -it --image=busybox -- nslookup <service>.<namespace>

# Vérifier les NetworkPolicies
k get networkpolicies -A
```

## Domaine 2 : Cluster Architecture (25%)

Ce qui tombe souvent :

### ETCD backup & restore

```bash
# Backup
ETCDCTL_API=3 etcdctl snapshot save /opt/backup/etcd.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Verify
ETCDCTL_API=3 etcdctl snapshot status /opt/backup/etcd.db

# Restore (mémoriser les flags !)
ETCDCTL_API=3 etcdctl snapshot restore /opt/backup/etcd.db \
  --data-dir=/var/lib/etcd-restore
```

### Upgrade du cluster

```bash
# Sur le control plane
kubeadm upgrade plan
kubeadm upgrade apply v1.29.0

# Upgrade kubelet
apt-get update && apt-get install -y kubelet=1.29.0-1.1
systemctl restart kubelet

# Sur les worker nodes
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
# ... upgrade sur le nœud ...
kubectl uncordon <node>
```

## Domaine 3 : Storage (10%)

```bash
# PersistentVolume
k get pv,pvc -A

# Exemple de PVC
k create -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
  storageClassName: standard
EOF
```

## Les pièges classiques

1. **Oublier `-n <namespace>`** : 30% des tâches spécifient un namespace non-default.
2. **Lire la question en entier** : souvent il y a un contexte kubectl à changer avec `kubectl config use-context`.
3. **Gaspiller du temps sur une tâche dure** : si une tâche vaut 4% et prend 20 minutes, passez à la suivante.
4. **Ne pas vérifier son travail** : après chaque tâche, faites un `kubectl get` pour confirmer.

## Planning de révision (4 semaines)

| Semaine | Focus |
|---|---|
| S1 | Killer.sh mock exam 1 — identifier les lacunes |
| S2 | Réviser les domaines faibles + labs pratiques |
| S3 | Killer.sh mock exam 2 + timing |
| S4 | Révision légère, repos 2j avant l'examen |

> **Killer.sh** (inclus dans la certification) est plus difficile que le vrai examen. Si vous y arrivez, vous êtes prêt.

## Ressources

- [Kubernetes Docs](https://kubernetes.io/docs) — à connaître par cœur pour la navigation
- [Killer.sh](https://killer.sh) — meilleur simulateur d'examen
- Taskfile personnel avec tous mes one-liners (publié sur ce blog prochainement)
