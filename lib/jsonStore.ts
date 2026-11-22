import fs from 'fs';
import path from 'path';

/**
 * Lecture/écriture JSON robuste pour les fichiers de `data/`.
 * - Écriture atomique : fichier temporaire + rename (jamais de JSON tronqué),
 *   avec copie `.bak` de la version précédente.
 * - Lecture : si le fichier est corrompu, tentative sur `.bak`, sinon erreur
 *   explicite (plutôt que de renvoyer une valeur vide qui serait réécrite).
 * Les accès sont synchrones : dans un processus Node unique, un cycle
 * lecture-modification-écriture n'est pas entrelacé.
 */
export function readJsonFile<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (err) {
    const bak = file + '.bak';
    if (fs.existsSync(bak)) {
      try {
        const recovered = JSON.parse(fs.readFileSync(bak, 'utf8')) as T;
        console.error(`[jsonStore] ${path.basename(file)} corrompu, restauré depuis .bak`);
        return recovered;
      } catch { /* .bak également illisible */ }
    }
    throw new Error(`Fichier de données corrompu : ${path.basename(file)} (${String(err)})`);
  }
}

export function writeJsonFile(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeFileSync(fd, JSON.stringify(data, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak');
  fs.renameSync(tmp, file);
}
