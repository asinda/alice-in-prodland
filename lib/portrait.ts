import fs from 'fs';
import path from 'path';

/** Portrait : renvoyé seulement si le fichier existe (public/alice.jpg|webp|png). Aucune image factice. */
export function findPortrait(): string | null {
  for (const ext of ['jpg', 'webp', 'png']) {
    if (fs.existsSync(path.join(process.cwd(), 'public', `alice.${ext}`))) return `/alice.${ext}`;
  }
  return null;
}
