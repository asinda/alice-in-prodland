'use server';

import { requireAdmin } from '../require-admin';

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import rehypeSanitize from 'rehype-sanitize';

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeSlug)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .use(rehypeHighlight, { ignoreMissing: true } as any)
  .use(rehypeStringify);

export async function actionRenderMarkdown(markdown: string): Promise<string> {
  await requireAdmin();
  const result = await processor.process(markdown);
  return result.toString();
}
