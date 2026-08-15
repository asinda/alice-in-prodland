import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cwd = process.cwd();
  const enDir = path.join(cwd, 'posts', 'en');
  const frDir = path.join(cwd, 'posts', 'fr');

  const enFiles = fs.existsSync(enDir) ? fs.readdirSync(enDir) : [];
  const frFiles = fs.existsSync(frDir) ? fs.readdirSync(frDir) : [];

  // Try reading one translation
  let sampleTranslation: string | null = null;
  const sampleFile = path.join(enDir, 'cka-exam-tips-2025.md');
  if (fs.existsSync(sampleFile)) {
    const raw = fs.readFileSync(sampleFile, 'utf8');
    sampleTranslation = raw.slice(0, 200);
  }

  return NextResponse.json({
    cwd,
    enDir,
    enDirExists: fs.existsSync(enDir),
    frDirExists: fs.existsSync(frDir),
    enFiles,
    frFiles: frFiles.length,
    sampleTranslation,
  });
}
