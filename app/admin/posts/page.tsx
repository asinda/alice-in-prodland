import Link from 'next/link';
import { getPosts } from '../../../lib/db';
import { actionPublishPost, actionUnpublishPost, actionDeletePost } from '../../../lib/actions/posts';
import styles from '../../../styles/Admin.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminPosts() {
  const posts = getPosts();

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>#</span> Posts & Tutoriels</h1>
        <Link href="/admin/posts/new" className={styles.btnPrimary}>+ Nouveau</Link>
      </div>

      {posts.length === 0 ? (
        <p className={styles.empty}>Aucun contenu. Crée ton premier post.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <tr key={post.id}>
                <td>
                  <Link href={`/admin/posts/${post.id}`} style={{ color: 'var(--text-heading)' }}>
                    {post.title}
                  </Link>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {post.type}
                </td>
                <td>
                  <span className={`${styles.badge} ${post.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>
                    {post.status}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {formatDate(post.createdAt)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href={`/admin/posts/${post.id}`} className={styles.btnSecondary}>Éditer</Link>
                    {post.status === 'draft' ? (
                      <form action={actionPublishPost.bind(null, post.id)} style={{ display: 'inline' }}>
                        <button type="submit" className={styles.btnGreen}>Publier</button>
                      </form>
                    ) : (
                      <form action={actionUnpublishPost.bind(null, post.id)} style={{ display: 'inline' }}>
                        <button type="submit" className={styles.btnSecondary}>Dépublier</button>
                      </form>
                    )}
                    <form action={actionDeletePost.bind(null, post.id)} style={{ display: 'inline' }}>
                      <button type="submit" className={styles.btnDanger}>✕</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
