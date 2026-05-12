import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import { getPosts, getPostBySlug as getDbPostBySlug, type ContentType, type Status, type Integrations } from './db';

const postsDir = path.join(process.cwd(), 'posts');

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  readTime: number;
}

export interface Post extends PostMeta {
  contentHtml: string;
  toc: TocEntry[];
}

// Filesystem posts cached once per process (files don't change without redeploy)
let _fsPosts: PostMeta[] | null = null;
const _fsPostCache = new Map<string, Post>();

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .use(rehypeHighlight, { ignoreMissing: true } as any)
  .use(rehypeStringify, { allowDangerousHtml: true });

function extractToc(html: string): TocEntry[] {
  const matches = [...html.matchAll(/<h([23])\s+id="([^"]*)"[^>]*>(.*?)<\/h[23]>/gi)];
  return matches.map(m => ({
    level: parseInt(m[1]),
    id: m[2],
    text: m[3].replace(/<[^>]+>/g, ''),
  }));
}

function readFsPosts(): PostMeta[] {
  if (_fsPosts) return _fsPosts;
  if (!fs.existsSync(postsDir)) { _fsPosts = []; return _fsPosts; }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
  _fsPosts = files
    .map(filename => {
      const slug = filename.replace(/\.md$/, '');
      const raw = fs.readFileSync(path.join(postsDir, filename), 'utf8');
      const { data, content } = matter(raw);
      const wordCount = content.trim().split(/\s+/).length;
      return {
        slug,
        title: data.title as string,
        date: data.date as string,
        excerpt: data.excerpt as string,
        tags: (data.tags as string[]) ?? [],
        readTime: Math.max(1, Math.round(wordCount / 200)),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return _fsPosts;
}

// DB posts are always read fresh so new admin posts appear immediately
function readDbPosts(): PostMeta[] {
  return getPosts({ status: 'published' }).map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.publishedAt ?? p.createdAt,
    excerpt: p.excerpt,
    tags: p.tags,
    readTime: Math.max(1, Math.round(p.content.trim().split(/\s+/).length / 200)),
  }));
}

export function getAllPosts(): PostMeta[] {
  const fsPosts = readFsPosts();
  const dbPosts = readDbPosts();
  const dbSlugs = new Set(dbPosts.map(p => p.slug));
  return [
    ...dbPosts,
    ...fsPosts.filter(p => !dbSlugs.has(p.slug)),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ─── Admin unified view ──────────────────────────────────────────────────────

export interface AdminPostRow {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  source: 'db' | 'fs';
  // présents uniquement si source === 'db'
  id?: string;
  type?: ContentType;
  status?: Status;
  integrations?: Integrations;
  createdAt?: string;
}

export function getFsPostRaw(slug: string): { title: string; excerpt: string; content: string; tags: string[]; date: string } | null {
  const filePath = path.join(postsDir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  return {
    title: (data.title as string) ?? slug,
    excerpt: (data.excerpt as string) ?? '',
    content,
    tags: (data.tags as string[]) ?? [],
    date: (data.date as string) ?? new Date().toISOString(),
  };
}

export function getAllAdminPosts(): AdminPostRow[] {
  const dbPosts = getPosts();
  const fsPosts = readFsPosts();
  const dbSlugs = new Set(dbPosts.map(p => p.slug));

  const dbRows: AdminPostRow[] = dbPosts.map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.createdAt,
    excerpt: p.excerpt,
    tags: p.tags,
    source: 'db' as const,
    id: p.id,
    type: p.type,
    status: p.status,
    integrations: p.integrations,
    createdAt: p.createdAt,
  }));

  const fsRows: AdminPostRow[] = fsPosts
    .filter(p => !dbSlugs.has(p.slug))
    .map(p => ({
      slug: p.slug,
      title: p.title,
      date: p.date,
      excerpt: p.excerpt,
      tags: p.tags,
      source: 'fs' as const,
    }));

  return [...dbRows, ...fsRows].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPost(slug: string): Promise<Post> {
  // DB takes precedence — always fresh, no cache
  const dbPost = getDbPostBySlug(slug);
  if (dbPost && dbPost.status === 'published') {
    const result = await processor.process(dbPost.content);
    const contentHtml = result.toString();
    const wordCount = dbPost.content.trim().split(/\s+/).length;
    return {
      slug: dbPost.slug,
      title: dbPost.title,
      date: dbPost.publishedAt ?? dbPost.createdAt,
      excerpt: dbPost.excerpt,
      tags: dbPost.tags,
      readTime: Math.max(1, Math.round(wordCount / 200)),
      contentHtml,
      toc: extractToc(contentHtml),
    };
  }

  // Fallback: filesystem post (cached)
  const cached = _fsPostCache.get(slug);
  if (cached) return cached;

  const raw = fs.readFileSync(path.join(postsDir, `${slug}.md`), 'utf8');
  const { data, content } = matter(raw);
  const result = await processor.process(content);
  const contentHtml = result.toString();
  const wordCount = content.trim().split(/\s+/).length;

  const post: Post = {
    slug,
    title: data.title as string,
    date: data.date as string,
    excerpt: data.excerpt as string,
    tags: (data.tags as string[]) ?? [],
    readTime: Math.max(1, Math.round(wordCount / 200)),
    contentHtml,
    toc: extractToc(contentHtml),
  };

  _fsPostCache.set(slug, post);
  return post;
}
