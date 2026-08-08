/**
 * Bulk FR->EN translation using unofficial Google Translate API (free, no account, no key)
 * Saves translations as real .md files in posts/en/
 * Usage: node scripts/translate-all.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// ── Translation via unofficial Google Translate endpoint ────────────────────

async function gtranslate(text, from = 'fr', to = 'en') {
  if (!text || !text.trim()) return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
  const data = await res.json();
  // data[0] is an array of [translated, original] pairs
  return data[0].map(seg => seg[0]).join('');
}

// Split markdown into chunks ≤ 4500 chars, preserving paragraph boundaries
function chunkText(text, max = 4500) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > max) {
      if (current) chunks.push(current.trim());
      if (para.length > max) {
        // Split oversized paragraph by sentences
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
  // Extract fenced code blocks so they are never translated
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
    // Small delay to avoid rate limiting
    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  return translated.join('\n\n').replace(/CODEBLOCK_(\d+)_END/g, (_, i) => codeBlocks[parseInt(i)]);
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const [k, ...v] = line.split(':');
    if (k) meta[k.trim()] = v.join(':').trim().replace(/^["']|["']$/g, '');
  }
  return { meta, content: match[2] };
}

function writeMd(filePath, { title, excerpt, translatedAt, content }) {
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `excerpt: ${JSON.stringify(excerpt)}`,
    `translatedAt: ${JSON.stringify(translatedAt)}`,
    '---',
    '',
    content.trim(),
    '',
  ].join('\n');
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, fm, 'utf8');
  fs.renameSync(tmp, filePath);
}

// ── Main ───────────────────────────────────────────────────────────────────

const postsJsonPath = path.join(root, 'data', 'posts.json');
const enDir = path.join(root, 'posts', 'en');
const frDir = path.join(root, 'posts', 'fr');

if (!fs.existsSync(enDir)) fs.mkdirSync(enDir, { recursive: true });

const existingEn = new Set(
  fs.readdirSync(enDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
);

let dbPosts = [];
try { dbPosts = JSON.parse(fs.readFileSync(postsJsonPath, 'utf8')); } catch {}

const fsSlugs = fs.existsSync(frDir)
  ? fs.readdirSync(frDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
  : [];
const dbSlugs = new Set(dbPosts.map(p => p.slug));

let done = 0, skipped = 0, errors = 0;

console.log(`\n📖 ${dbPosts.length} posts DB + ${fsSlugs.length} posts FS (FR)`);
console.log(`📁 posts/en/ : ${existingEn.size} traductions existantes\n`);

// Quick connectivity test
process.stdout.write('Test Google Translate... ');
try {
  const test = await gtranslate('bonjour', 'fr', 'en');
  console.log(`OK (bonjour -> "${test}")\n`);
} catch (e) {
  console.log(`ECHEC: ${e.message}\n`);
  process.exit(1);
}

// ── DB posts: contentEn stored in posts.json ────────────────────────────────
for (const post of dbPosts) {
  if (post.contentEn) { console.log(`  ⊘ [DB] ${post.slug}`); skipped++; continue; }
  process.stdout.write(`  → [DB] ${post.slug} ... `);
  try {
    const titleEn = await gtranslate(post.title);
    const excerptEn = post.excerpt ? await gtranslate(post.excerpt) : '';
    const contentEn = await translateMarkdown(post.content || '');
    post.titleEn = titleEn;
    post.excerptEn = excerptEn;
    post.contentEn = contentEn;
    post.updatedAt = new Date().toISOString();
    const tmp = postsJsonPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(dbPosts, null, 2));
    fs.renameSync(tmp, postsJsonPath);
    console.log('✓');
    done++;
  } catch (e) {
    console.log(`✗ ${e.message}`);
    errors++;
  }
}

// ── FS posts: translated as posts/en/[slug].md ──────────────────────────────
for (const slug of fsSlugs) {
  if (dbSlugs.has(slug)) continue; // handled above
  if (existingEn.has(slug)) { console.log(`  ⊘ [FS] ${slug}`); skipped++; continue; }

  const raw = fs.readFileSync(path.join(frDir, slug + '.md'), 'utf8');
  const { meta, content } = parseFrontmatter(raw);
  const title = meta.title || slug;
  const excerpt = meta.excerpt || '';

  process.stdout.write(`  → [FS] ${slug} ... `);
  try {
    const titleEn = await gtranslate(title);
    const excerptEn = excerpt ? await gtranslate(excerpt) : '';
    const contentEn = await translateMarkdown(content);
    writeMd(path.join(enDir, slug + '.md'), {
      title: titleEn,
      excerpt: excerptEn,
      translatedAt: new Date().toISOString(),
      content: contentEn,
    });
    existingEn.add(slug);
    console.log('✓');
    done++;
  } catch (e) {
    console.log(`✗ ${e.message}`);
    errors++;
  }
}

console.log(`\n✓ ${done} traduits  ⊘ ${skipped} ignorés  ✗ ${errors} erreurs\n`);
