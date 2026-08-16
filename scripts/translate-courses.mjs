/**
 * FR->EN translation for all courses and their lessons.
 * Generates data/courses-translations-bundle.json — a static webpack import.
 * Usage: node scripts/translate-courses.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const coursesPath = path.join(root, 'data', 'courses.json');
const bundlePath = path.join(root, 'data', 'courses-translations-bundle.json');

// ── Google Translate (free, no key) ────────────────────────────────────────

async function gtranslate(text, from = 'fr', to = 'en') {
  if (!text || !text.trim()) return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data[0].map(seg => seg[0]).join('');
}

function chunkText(text, max = 4500) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > max) {
      if (current) chunks.push(current.trim());
      if (para.length > max) {
        const sentences = para.split(/(?<=[.!?])\s+/);
        let sub = '';
        for (const s of sentences) {
          if ((sub + ' ' + s).length > max) {
            if (sub) chunks.push(sub.trim());
            sub = s;
          } else {
            sub = sub ? sub + ' ' + s : s;
          }
        }
        if (sub) chunks.push(sub.trim());
        current = '';
      } else {
        current = para;
      }
    } else {
      current = current ? current + '\n\n' + para : para;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function translateMarkdown(md) {
  if (!md || !md.trim()) return md;
  const codeBlocks = [];
  const ph = (i) => `CODEBLOCK_${i}_END`;
  const withoutCode = md.replace(/```[\s\S]*?```/g, (match) => {
    const i = codeBlocks.length;
    codeBlocks.push(match);
    return ph(i);
  });

  const chunks = chunkText(withoutCode);
  const translated = [];
  for (let i = 0; i < chunks.length; i++) {
    const t = await gtranslate(chunks[i]);
    translated.push(t);
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 400));
  }
  return translated.join('\n\n').replace(/CODEBLOCK_(\d+)_END/g, (_, i) => codeBlocks[parseInt(i)]);
}

// ── Load existing bundle (for idempotency) ─────────────────────────────────

let bundle = {};
try { bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8')); } catch {}

function saveBundle() {
  const tmp = bundlePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(bundle, null, 2), 'utf8');
  fs.renameSync(tmp, bundlePath);
}

// ── Main ───────────────────────────────────────────────────────────────────

const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
let done = 0, skipped = 0, errors = 0;

// Quick connectivity test
process.stdout.write('Test Google Translate... ');
try {
  const test = await gtranslate('bonjour');
  console.log(`OK ("${test}")\n`);
} catch (e) {
  console.error(`FAIL: ${e.message}`);
  process.exit(1);
}

for (const course of courses) {
  const existing = bundle[course.slug] ?? { lessons: {} };

  // Course title + description
  if (existing.titleEn) {
    console.log(`  ⊘ course ${course.slug}`);
    skipped++;
  } else {
    process.stdout.write(`  → course ${course.slug} ... `);
    try {
      existing.titleEn = await gtranslate(course.title);
      existing.descriptionEn = course.description ? await gtranslate(course.description) : '';
      existing.lessons = existing.lessons ?? {};
      bundle[course.slug] = existing;
      saveBundle();
      console.log('✓');
      done++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      errors++;
      continue;
    }
  }

  if (!existing.lessons) existing.lessons = {};

  // Lessons
  for (const lesson of course.lessons) {
    if (existing.lessons[lesson.slug]?.titleEn) {
      console.log(`    ⊘ lesson ${lesson.slug}`);
      skipped++;
      continue;
    }
    process.stdout.write(`    → lesson ${lesson.slug} (${lesson.content?.length ?? 0} chars) ... `);
    try {
      const titleEn = await gtranslate(lesson.title);
      const contentEn = await translateMarkdown(lesson.content || '');
      existing.lessons[lesson.slug] = { titleEn, contentEn };
      bundle[course.slug] = existing;
      saveBundle();
      console.log('✓');
      done++;
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`✗ ${e.message}`);
      errors++;
    }
  }
}

console.log(`\n✓ ${done} traduits  ⊘ ${skipped} ignorés  ✗ ${errors} erreurs`);
console.log(`Bundle: ${bundlePath}`);
