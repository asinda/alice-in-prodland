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

// Runtime filesystem path (used by setTranslation to write new translations)
const enDir = path.join(process.cwd(), 'posts', 'en');

function validateSlug(slug: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) throw new Error('Invalid slug');
}

export function getTranslation(slug: string): Translation | null {
  validateSlug(slug);
  // Primary: bundled at build time (always works in production)
  if (bundled[slug]) return bundled[slug];
  // Fallback: runtime filesystem (for new translations not yet bundled)
  try {
    const filePath = path.join(enDir, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
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

export function setTranslation(slug: string, t: Omit<Translation, 'translatedAt'>): void {
  validateSlug(slug);
  if (!fs.existsSync(enDir)) fs.mkdirSync(enDir, { recursive: true });
  const translatedAt = new Date().toISOString();
  const fileContent = matter.stringify(t.contentEn, {
    title: t.titleEn,
    excerpt: t.excerptEn,
    translatedAt,
  });
  const filePath = path.join(enDir, `${slug}.md`);
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, fileContent);
  fs.renameSync(tmp, filePath);
}

export function getAllTranslations(): Record<string, Translation> {
  return { ...bundled };
}
