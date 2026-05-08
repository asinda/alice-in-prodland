import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts, getPost } from '../../../lib/posts';
import TableOfContents from '../../../components/TableOfContents';
import CopyCode from '../../../components/CopyCode';
import styles from '../../../styles/Post.module.css';

const TAG_COLORS: Record<string, string> = {
  kubernetes: 'blue', 'github-actions': 'purple', SRE: 'green',
  devops: 'orange', debugging: 'yellow', OOM: 'red',
  cheatsheet: 'blue', postmortem: 'red', incidents: 'red',
  postgresql: 'orange', CKA: 'green', certification: 'green',
  career: 'yellow', kubectl: 'blue',
};

function tagColor(tag: string) { return TAG_COLORS[tag] ?? 'default'; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return {
    title: `${post.title} — alice-in-prodland`,
    description: post.excerpt,
  };
}

export default async function BlogPost(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPost(slug);

  return (
    <>
      <div className={styles.backLink}>
        <Link href="/blog">← Retour au blog</Link>
      </div>

      <div className={post.toc.length > 0 ? styles.articleWrapper : undefined}>
        <article>
          <header className={styles.header}>
            <div className={styles.meta}>
              <time className={styles.date}>{formatDate(post.date)}</time>
              <span className={styles.separator}>·</span>
              <span className={styles.readTime}>{post.readTime} min de lecture</span>
            </div>
            <h1 className={styles.title}>{post.title}</h1>
            <p className={styles.excerpt}>{post.excerpt}</p>
            <div className={styles.tagList}>
              {post.tags.map(tag => (
                <span key={tag} className={styles.tag} data-color={tagColor(tag)}>
                  {tag}
                </span>
              ))}
            </div>
          </header>

          <div
            id="post-content"
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </article>

        {post.toc.length > 0 && (
          <aside className={styles.tocSidebar}>
            <TableOfContents toc={post.toc} />
          </aside>
        )}
      </div>

      <CopyCode contentId="post-content" />

      <div className={styles.footer}>
        <Link href="/blog" className={styles.backBtn}>
          ← Tous les articles
        </Link>
      </div>
    </>
  );
}
