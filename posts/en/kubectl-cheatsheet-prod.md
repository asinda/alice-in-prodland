---
title: "My production kubectl cheatsheet (updated 2025)"
excerpt: "The kubectl commands that I really use in production, classified by emergency situation. No theory, just what works."
translatedAt: "2026-08-08T07:21:14.203Z"
---

This is not yet another kubectl tutorial. These are the commands that I have in my snippets because they saved my production.

## Quick diagnosis

```bash
# Vue d'ensemble immédiate
kubectl get pods,svc,deploy,ingress -n <ns> -o wide

# Qu'est-ce qui ne va pas ?
kubectl get events -n <ns> --sort-by=.lastTimestamp | tail -30

# Pod qui refuse de démarrer
kubectl describe pod <pod> -n <ns> | tail -40

# Logs en temps réel multi-pods
kubectl logs -n <ns> -l app=<name> -f --max-log-requests=10
```

## Access and debug

```bash
# Shell dans un pod
kubectl exec -it <pod> -n <ns> -- /bin/sh

# Sans shell dans l'image ? Ephemeral container (K8s 1.23+)
kubectl debug -it <pod> -n <ns> --image=nicolaka/netshoot --target=<container>

# Copier un fichier depuis/vers un pod
kubectl cp <ns>/<pod>:/app/logs/error.log ./error.log
kubectl cp ./config.yaml <ns>/<pod>:/tmp/config.yaml

# Port-forward pour tester en local
kubectl port-forward -n <ns> svc/<service> 8080:80
```

## Quick manipulations

```bash
# Restart d'un deployment sans downtime
kubectl rollout restart deployment/<name> -n <ns>

# Scale rapide
kubectl scale deployment/<name> -n <ns> --replicas=0
kubectl scale deployment/<name> -n <ns> --replicas=3

# Rollback au déploiement précédent
kubectl rollout undo deployment/<name> -n <ns>

# Voir l'historique
kubectl rollout history deployment/<name> -n <ns>
```

## Labels and selectors

```bash
# Ajouter un label
kubectl label pod <pod> -n <ns> debug=true

# Retirer un label
kubectl label pod <pod> -n <ns> debug-

# Trouver tous les pods avec un label
kubectl get pods -A -l env=production,tier=frontend
```

## Resources and quotas

```bash
# Consommation CPU/RAM
kubectl top pods -n <ns> --sort-by=cpu
kubectl top nodes

# Vérifier les quotas d'un namespace
kubectl describe resourcequota -n <ns>
kubectl describe limitrange -n <ns>

# Quels pods mangent le plus de CPU sur le cluster ?
kubectl top pods -A --sort-by=cpu | head -15
```

## Secrets and ConfigMaps

```bash
# Voir un secret décodé
kubectl get secret <name> -n <ns> -o jsonpath='{.data}' | \
  jq 'to_entries[] | .key + ": " + (.value | @base64d)'

# Créer un secret depuis un fichier
kubectl create secret generic <name> \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem \
  -n <ns>

# Hot-reload d'un configmap (avec annotation)
kubectl rollout restart deployment/<name> -n <ns>
```

## Network debug

```bash
# Tester la connectivité depuis un pod temporaire
kubectl run netcheck --rm -it --image=nicolaka/netshoot -- \
  curl -v http://my-service.namespace.svc.cluster.local:8080/health

# Vérifier les endpoints d'un service
kubectl get endpoints <svc> -n <ns>

# DNS resolution
kubectl run dnscheck --rm -it --image=busybox -- \
  nslookup my-service.namespace.svc.cluster.local
```

## Cleaning

```bash
# Supprimer tous les pods Failed/Completed
kubectl delete pods -A --field-selector=status.phase=Failed
kubectl delete pods -A --field-selector=status.phase=Succeeded

# Forcer la suppression d'un pod bloqué en Terminating
kubectl delete pod <pod> -n <ns> --grace-period=0 --force

# Nettoyer les images sur tous les nœuds (à faire avec prudence)
kubectl get nodes -o name | xargs -I{} kubectl debug {} --image=alpine \
  -- sh -c "crictl rmi --prune"
```

## Aliases to put in your .bashrc

```bash
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgpa='kubectl get pods -A'
alias kdp='kubectl describe pod'
alias klf='kubectl logs -f'
alias kex='kubectl exec -it'
alias kns='kubectl config set-context --current --namespace'
```

## My multi-cluster kubeconfig config

```bash
# Lister les contextes
kubectl config get-contexts

# Changer de contexte
kubectl config use-context production-eu-west-1

# Contexte courant
kubectl config current-context

# Fusionner deux kubeconfigs
KUBECONFIG=~/.kube/config-prod:~/.kube/config-staging \
  kubectl config view --flatten > ~/.kube/config
```

> **Tip**: I use [kubectx + kubens](https://github.com/ahmetb/kubectx) to switch context/namespace in one command. Essential when managing 10+ clusters.
