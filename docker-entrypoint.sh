#!/bin/sh
set -e

# On first boot with an empty persistent volume, seed the data files
if [ ! -f /app/data/courses.json ]; then
  echo "First boot: seeding courses.json from image..."
  cp /app/data-seed/courses.json /app/data/courses.json
fi

if [ ! -f /app/data/posts.json ]; then
  echo "First boot: seeding posts.json from image..."
  cp /app/data-seed/posts.json /app/data/posts.json
fi

exec "$@"
