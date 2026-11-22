import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
// Bundled at build time — always available regardless of process.cwd() in production
import bundle from '../data/translations-bundle.json';

export interface Translation {
  titleEn: string;
  excerptEn: string;
  contentEn: string;
  translatedAt: string;
}

type Bundle = Record<string, Translation>;
const bundled = bundle as Bundle;

// Traductions écrites à l'exécution : sur le VOLUME persistant (data/), pas dans l'image,
// sinon elles disparaissent à chaque redéploiement.
const runtimeDir = path.join(process.cwd(), 'data', 'translations-en');
// Ancien emplacement (versionné dans l'image) : lecture seule, en dernier recours.
const legacyDir = path.join(process.cwd(), 'posts', 'en');

function validateSlug(slug: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) throw new Error('Invalid slug');
}

function readMd(dir: string, slug: string): Translation | null {
  try {
    const filePath = path.join(dir, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;
    const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
    return {
      titleEn: data.title || '',
      excerptEn: data.excerpt || '',
      contentEn: content.trim(),
      translatedAt: data.translatedAt || '',
    };
  } catch {
    return null;
  }
}

/** Priorité : volume (le plus récent) > bundle du build > ancien dossier posts/en. */
export function getTranslation(slug: string): Translation | null {
  validateSlug(slug);
  return readMd(runtimeDir, slug) ?? bundled[slug] ?? readMd(legacyDir, slug);
}

export function setTranslation(slug: string, t: Omit<Translation, 'translatedAt'>): void {
  validateSlug(slug);
  fs.mkdirSync(runtimeDir, { recursive: true });
  const translatedAt = new Date().toISOString();
  const fileContent = matter.stringify(t.contentEn, {
    title: t.titleEn,
    excerpt: t.excerptEn,
    translatedAt,
  });
  const filePath = path.join(runtimeDir, `${slug}.md`);
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, fileContent);
  fs.renameSync(tmp, filePath);
}

export function getAllTranslations(): Record<string, Translation> {
  const all: Record<string, Translation> = { ...bundled };
  try {
    for (const f of fs.readdirSync(runtimeDir)) {
      if (!f.endsWith('.md')) continue;
      const slug = f.replace(/\.md$/, '');
      const t = readMd(runtimeDir, slug);
      if (t) all[slug] = t;
    }
  } catch { /* dossier absent : aucune traduction runtime */ }
  return all;
}
