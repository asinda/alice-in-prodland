import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const enDir = path.join(process.cwd(), 'posts', 'en');

export interface Translation {
  titleEn: string;
  excerptEn: string;
  contentEn: string;
  translatedAt: string;
}

function enFilePath(slug: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) throw new Error('Invalid slug');
  const filePath = path.join(enDir, `${slug}.md`);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(enDir) + path.sep)) throw new Error('Path traversal detected');
  return resolved;
}

export function getTranslation(slug: string): Translation | null {
  const filePath = enFilePath(slug);
  if (!fs.existsSync(filePath)) return null;
  try {
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
  if (!fs.existsSync(enDir)) fs.mkdirSync(enDir, { recursive: true });
  const translatedAt = new Date().toISOString();
  const fileContent = matter.stringify(t.contentEn, {
    title: t.titleEn,
    excerpt: t.excerptEn,
    translatedAt,
  });
  const filePath = enFilePath(slug);
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, fileContent);
  fs.renameSync(tmp, filePath);
}

export function getAllTranslations(): Record<string, Translation> {
  if (!fs.existsSync(enDir)) return {};
  const result: Record<string, Translation> = {};
  for (const file of fs.readdirSync(enDir)) {
    if (!file.endsWith('.md')) continue;
    const slug = file.replace('.md', '');
    const t = getTranslation(slug);
    if (t) result[slug] = t;
  }
  return result;
}
