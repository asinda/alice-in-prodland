import Link from 'next/link';
import { getAllAdminPosts } from '../../../lib/posts';
import type { Status, ContentType } from '../../../lib/db';
import {
  actionPublishPost, actionUnpublishPost, actionDeletePost,
  actionRepushPostIntegrations, actionImportFsPost, actionHidePost,
} from '../../../lib/actions/posts';
import { getSchedule } from '../../../lib/schedule';
import SchedulePostForm from '../../../components/admin/SchedulePostForm';
import AdminFilterBar from '../../../components/AdminFilterBar';
import styles from '../../../styles/Admin.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function AdminPosts({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const { q = '', status = '', type = '' } = await searchParams;

  let posts = getAllAdminPosts();
  const scheduledBySlug = new Map(getSchedule().filter(e => e.status === 'pending').map(e => [e.slug, e]));

  if (status) {
    posts = posts.filter(p => {
      if (p.source === 'fs') return status === 'published';
      return p.status === (status as Status);
    });
  }
  if (type) {
    posts = posts.filter(p => {
      if (p.source === 'fs') return type === 'post';
      return p.type === (type as ContentType);
    });
  }
  if (q) {
    const lq = q.toLowerCase();
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(lq) ||
      p.tags.some(t => t.toLowerCase().includes(lq)) ||
      p.excerpt.toLowerCase().includes(lq)
    );
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Articles</h1>
        <Link href="/admin/posts/new" className={styles.btnPrimary}>+ Nouveau</Link>
      </div>

      <AdminFilterBar q={q} status={status} typeFilter={type} showType />

      {posts.length === 0 ? (
        <p className={styles.empty}>
          {q || status || type ? 'Aucun résultat pour ces filtres.' : 'Aucun contenu.'}
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Type</th>
              <th>Statut</th>
              <th>LinkedIn</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => {
              if (post.source === 'fs') {
                return (
                  <tr key={`fs-${post.slug}`}>
                    <td>
                      <span style={{ color: 'var(--text-heading)' }}>{post.title}</span>
                      {' '}
                      <span className={`${styles.badge} ${styles.badgeFs}`}>.md</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      post
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgePublished}`}>en ligne</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      —
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {formatDate(post.date)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <form action={actionImportFsPost.bind(null, post.slug)} style={{ display: 'inline' }}>
                          <button type="submit" className={styles.btnSecondary} title="Importer dans la base pour pouvoir l'éditer">
                            ↓ Importer & éditer
                          </button>
                        </form>
                        <form action={actionHidePost.bind(null, post.slug)} style={{ display: 'inline' }}>
                          <button type="submit" className={styles.btnSecondary} title="Retire l'article du site sans le supprimer : il reste ici, éditable, et peut être republié ou programmé">
                            Masquer
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              }

              const li = post.integrations!.linkedin;
              return (
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
                    <span className={`${styles.badge} ${post.status === 'published' ? styles.badgePublished : styles.badgeDraft}`} title={post.status === 'published' ? undefined : 'Invisible sur le site : brouillon ou article masqué'}>
                      {post.status === 'published' ? 'en ligne' : 'hors ligne'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {li.status === 'success' && (
                      <a href={li.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>✓ publié</a>
                    )}
                    {li.status === 'error' && <span style={{ color: '#f85149' }} title={li.error}>✗ erreur</span>}
                    {li.status === 'skipped' && <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    {li.status === 'idle' && <span style={{ color: 'var(--text-muted)' }}>idle</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {formatDate(post.createdAt!)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link href={`/admin/posts/${post.id}`} className={styles.btnSecondary}>Éditer</Link>
                      {post.status === 'draft' ? (
                        <>
                          <form action={actionPublishPost.bind(null, post.id!)} style={{ display: 'inline' }}>
                            <button type="submit" className={styles.btnGreen}>Publier</button>
                          </form>
                          <SchedulePostForm
                            slug={post.slug}
                            scheduled={scheduledBySlug.get(post.slug) ? { id: scheduledBySlug.get(post.slug)!.id, scheduledAt: scheduledBySlug.get(post.slug)!.scheduledAt } : undefined}
                            compact
                          />
                        </>
                      ) : (
                        <>
                          <form action={actionUnpublishPost.bind(null, post.id!)} style={{ display: 'inline' }}>
                            <button type="submit" className={styles.btnSecondary} title="Retire l'article du site sans le supprimer">Masquer</button>
                          </form>
                          <form action={actionRepushPostIntegrations.bind(null, post.id!)} style={{ display: 'inline' }}>
                            <button type="submit" className={styles.btnSecondary} title="Re-publier sur LinkedIn">in</button>
                          </form>
                        </>
                      )}
                      <form action={actionDeletePost.bind(null, post.id!)} style={{ display: 'inline' }}>
                        <button type="submit" className={styles.btnDanger}>✕</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
