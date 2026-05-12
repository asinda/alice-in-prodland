import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPostById } from '../../../../../lib/db';
import { actionRenderMarkdown } from '../../../../../lib/actions/markdown';
import styles from '../../../../../styles/Admin.module.css';

export default async function PostPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPostById(id);
  if (!post) notFound();

  const contentHtml = await actionRenderMarkdown(post.content);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>◉</span> Aperçu</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className={styles.previewBanner}>brouillon</span>
          <Link href={`/admin/posts/${id}`} className={styles.btnSecondary}>← Éditer</Link>
        </div>
      </div>

      <article className={styles.articlePreview}>
        <h1>{post.title}</h1>

        {post.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0 1.5rem' }}>
            {post.tags.map(tag => (
              <span key={tag} className={`${styles.badge} ${styles.badgeDraft}`}>{tag}</span>
            ))}
          </div>
        )}

        {post.excerpt && (
          <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '1.5rem', borderLeft: '3px solid var(--border)', paddingLeft: '1rem' }}>
            {post.excerpt}
          </p>
        )}

        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </article>
    </>
  );
}
