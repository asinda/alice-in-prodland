---
title: "CKA 2025: what I would have liked to know before taking the exam"
excerpt: "I passed the CKA in March 2025 with a score of 91%. Here are my real prep notes: traps, speed tricks, and areas where people waste time."
translatedAt: "2026-08-08T07:02:05.239Z"
---

Final score: **91%**. Remaining time: 8 minutes out of 120. Here's what I wish I knew.

## Exam Format (2025)

- **17 practical tasks** in a real terminal environment
- **120 minutes** (yes, it's short)
- **Minimum score**: 66%
- **Authorized documentation**: kubernetes.io/docs only
- **Domain weights**:

| Area | Weight |
|---|---|
| Storage | 10% |
| Troubleshooting | 30% |
| Workloads & Scheduling | 15% |
| Cluster Architecture | 25% |
| Services & Networking | 20% |

## Setting up your work environment

First thing to do at the start of the exam:

```bash
# Aliases
alias k=kubectl
export do="--dry-run=client -o yaml"
export now="--grace-period=0 --force"

# Auto-completion
source <(kubectl completion bash)
complete -F __start_kubectl k
```

These 4 lines will save you 15-20 minutes on the exam.

## Essential commands (never write YAML by hand)

```bash
# Pod
k run nginx --image=nginx $do > pod.yaml

# Deployment
k create deployment app --image=nginx --replicas=3 $do > deploy.yaml

# Service (expose a deployment)
k expose deployment app --port=80 --target-port=8080 --type=ClusterIP $do > svc.yaml

# ConfigMap
k create configmap myconfig --from-literal=key=value $do

# Secret
k create secret generic mysecret --from-literal=password=s3cr3t $do

# ServiceAccount
k create serviceaccount mysa -n mynamespace $do

# Role + RoleBinding in one command
k create role pod-reader --verb=get,list,watch --resource=pods $do
k create rolebinding pod-reader-binding --role=pod-reader --user=alice $do
```

## Domain 1: Troubleshooting (30% -- most important)

This is where the exam is won or lost. Typical scenarios:

### Pod not starting

```bash
k describe pod <name>    # Check Events
k logs <pod>             # Container logs
k logs <pod> --previous  # Logs before last crash
```

### Node NotReady

```bash
k describe node <name>   # Conditions, events
ssh <node>               # If access is possible
systemctl status kubelet
journalctl -u kubelet -n 50
```

### Network issue

```bash
# Check that endpoints exist
k get endpoints <service>

# Test DNS resolution
k run test --rm -it --image=busybox -- nslookup <service>.<namespace>

# Check NetworkPolicies
k get networkpolicies -A
```

## Domain 2: Cluster Architecture (25%)

What often comes up:

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

# Restore (remember the flags!)
ETCDCTL_API=3 etcdctl snapshot restore /opt/backup/etcd.db \
  --data-dir=/var/lib/etcd-restore
```

### Cluster Upgrade

```bash
# On the control plane
kubeadm upgrade plan
kubeadm upgrade apply v1.29.0

# Upgrade kubelet
apt-get update && apt-get install -y kubelet=1.29.0-1.1
systemctl restart kubelet

# On worker nodes
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
# ... upgrade on node ...
kubectl uncordon <node>
```

## Domain 3: Storage (10%)

```bash
# PersistentVolume
k get pv,pvc -A

# Example PVC
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

## Classic traps

1. **Forgetting `-n <namespace>`**: 30% of tasks specify a non-default namespace.
2. **Not reading the full question**: there is often a kubectl context to switch with `kubectl config use-context`.
3. **Wasting time on a hard task**: if a task is worth 4% and takes 20 minutes, move on.
4. **Not checking your work**: after each task, do a `kubectl get` to confirm.

## Revision schedule (4 weeks)

| Week | Focus |
|---|---|
| W1 | Killer.sh mock exam 1 -- identify gaps |
| W2 | Review weak areas + practical labs |
| W3 | Killer.sh mock exam 2 + timing |
| W4 | Light revision, rest 2 days before the exam |

> **Killer.sh** (included in the certification) is harder than the real exam. If you can pass it, you're ready.

## Resources

- [Kubernetes Docs](https://kubernetes.io/docs) -- know how to navigate it by heart
- [Killer.sh](https://killer.sh) -- best exam simulator
- Personal taskfile with all my one-liners (published on this blog soon)
