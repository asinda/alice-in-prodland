#!/bin/sh
set -e

# Premier démarrage avec un volume vide : copie chaque fichier JSON de data-seed/
# qui n'existe pas encore dans /app/data (sans jamais écraser les données existantes).
mkdir -p /app/data
for f in /app/data-seed/*.json; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  if [ ! -f "/app/data/$name" ]; then
    echo "Seeding $name from image..."
    cp "$f" "/app/data/$name"
  fi
done

exec "$@"
