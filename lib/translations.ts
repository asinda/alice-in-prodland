import fs from 'fs';
import path from 'path';

const dataFile = path.join(process.cwd(), 'data', 'translations.json');

export interface Translation {
  titleEn: string;
  excerptEn: string;
  contentEn: string;
  translatedAt: string;
}

function readAll(): Record<string, Translation> {
  if (!fs.existsSync(dataFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, Translation>): void {
  const tmp = dataFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, dataFile);
}

export function getTranslation(slug: string): Translation | null {
  return readAll()[slug] ?? null;
}

export function setTranslation(slug: string, t: Omit<Translation, 'translatedAt'>): void {
  const all = readAll();
  all[slug] = { ...t, translatedAt: new Date().toISOString() };
  writeAll(all);
}

export function getAllTranslations(): Record<string, Translation> {
  return readAll();
}
