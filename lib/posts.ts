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

// Module-level memo — unified runs once per server process, not per request
let _allPosts: PostMeta[] | null = null;
const _postCache = new Map<string, Post>();

// Shared processor instance (expensive to create)
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

export function getAllPosts(): PostMeta[] {
  if (_allPosts) return _allPosts;

  if (!fs.existsSync(postsDir)) {
    _allPosts = [];
    return _allPosts;
  }

  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

  _allPosts = files
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

  return _allPosts;
}

export async function getPost(slug: string): Promise<Post> {
  const cached = _postCache.get(slug);
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

  _postCache.set(slug, post);
  return post;
}
