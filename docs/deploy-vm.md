# Déploiement sur une VM gratuite (Oracle Cloud) avec GitHub Actions

À chaque fusion sur `main`, GitHub construit l'image Docker, la publie sur `ghcr.io`, la déploie sur la VM par SSH et vérifie `/api/health`. HTTPS est géré automatiquement par Caddy. Les données vivent sur un volume Docker persistant.

> Les offres gratuites changent : vérifiez les conditions d'Oracle Cloud « Always Free » avant de vous engager. Oracle peut manquer de capacité ARM dans une région et peut récupérer des instances inactives. Gardez des sauvegardes (étape 7).

## 1. Créer la VM (Oracle Cloud)
1. Créez un compte sur oracle.com/cloud/free (une carte bancaire sert à la vérification). Choisissez soigneusement la **région d'origine** : elle ne se change plus.
2. *Compute → Instances → Create instance* :
   - Image : **Ubuntu 24.04** (ou 22.04).
   - Forme : **Ampere A1 (VM.Standard.A1.Flex)**, 1 à 2 OCPU et 6 à 12 Go (arm64). À défaut : AMD `E2.1.Micro` (amd64, 1 Go, juste suffisant). L'image est construite pour les deux architectures.
   - Clé SSH : générez-en une sur votre poste, `ssh-keygen -t ed25519 -f oracle_vm`, et collez le contenu de `oracle_vm.pub`.
3. *Networking → Virtual Cloud Network → Security List* : ajoutez des règles d'**entrée** TCP pour les ports **80** et **443** depuis `0.0.0.0/0`.
4. Notez l'**adresse IP publique** de la VM.

## 2. Nom de domaine gratuit (DuckDNS)
1. Sur duckdns.org, connectez-vous (avec GitHub par exemple) et créez un sous-domaine, par exemple `alice-in-prodland` (soit `alice-in-prodland.duckdns.org`).
2. Renseignez l'adresse IP de la VM comme « current ip ».

## 3. Préparer la VM
Connectez-vous : `ssh -i oracle_vm ubuntu@IP_DE_LA_VM`, puis :

```bash
# Docker
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER   # puis déconnectez-vous et reconnectez-vous

# Pare-feu de la VM (les images Oracle bloquent 80/443 par défaut)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Créez le fichier d'environnement (valeurs **runtime**, jamais commitées) :

```bash
mkdir -p ~/alice-in-prodland && cd ~/alice-in-prodland
nano .env && chmod 600 .env
```

```dotenv
DOMAIN=alice-in-prodland.duckdns.org
NEXT_PUBLIC_SITE_URL=https://alice-in-prodland.duckdns.org
JWT_SECRET=...            # openssl rand -base64 48
ADMIN_PASSWORD=...
PUBLISH_SECRET=...        # openssl rand -base64 32
BACKUP_SECRET=...         # openssl rand -base64 32
ANTHROPIC_API_KEY=...
# MAINTENANCE_MODE=true   # pour afficher la page « en construction »
# + jetons LinkedIn / Instagram / YouTube si besoin (voir .env.example)
```

## 4. Clé de déploiement et empreinte de la VM
Sur votre poste, créez une clé **dédiée au déploiement** et autorisez-la sur la VM :

```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
ssh -i oracle_vm ubuntu@IP 'cat >> ~/.ssh/authorized_keys' < deploy_key.pub
ssh-keyscan -t ed25519 IP > known_hosts.txt      # empreinte de la VM
```

Comparez l'empreinte de `known_hosts.txt` avec celle affichée lors de votre première connexion SSH, pour éviter une usurpation.

## 5. Configurer GitHub
*Dépôt → Settings → Secrets and variables → Actions* :

| Type | Nom | Valeur |
|---|---|---|
| Secret | `VM_HOST` | IP de la VM |
| Secret | `VM_USER` | `ubuntu` |
| Secret | `VM_SSH_KEY` | contenu du fichier `deploy_key` (clé **privée**) |
| Secret | `VM_KNOWN_HOSTS` | contenu de `known_hosts.txt` |
| Variable | `SITE_URL` | `https://alice-in-prodland.duckdns.org` |
| Variables (facultatif) | `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_HOST_NAME`, `NEXT_PUBLIC_HOST_ADDRESS`, `NEXT_PUBLIC_HOST_URL`, `NEXT_PUBLIC_CF_BEACON_TOKEN` | voir `.env.example` |

Supprimez ensuite `deploy_key` de votre poste si vous n'en avez plus besoin. Mettez aussi à jour les secrets `SITE_URL` et `PUBLISH_SECRET` utilisés par le workflow de publication planifiée (`publish.yml`).

## 6. Premier déploiement
1. Fusionnez sur `main`, ou lancez *Actions → Deploy → Run workflow*.
2. **Après la première construction**, passez le paquet en public : GitHub → profil → *Packages* → `alice-in-prodland` → *Package settings* → *Change visibility → Public*. Si vous préférez le garder privé, exécutez sur la VM `docker login ghcr.io -u VOTRE_PSEUDO` avec un jeton `read:packages`.
3. Relancez le workflow si l'étape de téléchargement a échoué. Le site doit répondre sur votre domaine, et `/api/health` renvoyer `{"status":"ok"}`.

Les mises à jour suivantes sont automatiques à chaque fusion sur `main`.

## 7. Sauvegardes
Sur la VM, `crontab -e` :

```cron
0 3 * * * mkdir -p ~/backups && curl -fsS -H "Authorization: Bearer $(grep '^BACKUP_SECRET=' ~/alice-in-prodland/.env | cut -d= -f2-)" https://alice-in-prodland.duckdns.org/api/backup -o ~/backups/data-$(date +\%F).json && find ~/backups -mtime +30 -delete
```

Copiez régulièrement `~/backups` hors de la VM (`scp`), car une sauvegarde sur la même machine ne protège pas de sa perte.

## Retour arrière
Les images sont étiquetées avec le commit (`:<12 premiers caractères du SHA>`). Sur la VM :

```bash
cd ~/alice-in-prodland && IMAGE_TAG=<ancien-sha> docker compose up -d
```

Pour afficher la page de maintenance : `MAINTENANCE_MODE=true` dans `.env`, puis `docker compose up -d`.
