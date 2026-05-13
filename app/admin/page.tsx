import Link from 'next/link';
import { getAllAdminPosts } from '../../lib/posts';
import { getCourses } from '../../lib/db';
import styles from '../../styles/Admin.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
  const posts = getAllAdminPosts();
  const courses = getCourses();

  const publishedPosts = posts.filter(p => p.source === 'db' ? p.status === 'published' : true).length;
  const draftPosts = posts.filter(p => p.source === 'db' && p.status === 'draft').length;
  const publishedCourses = courses.filter(c => c.status === 'published').length;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>~</span> Dashboard</h1>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{posts.length}</span>
          <span className={styles.statLabel}>posts total</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: 'var(--accent-green)' }}>{publishedPosts}</span>
          <span className={styles.statLabel}>publiés</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: 'var(--text-muted)' }}>{draftPosts}</span>
          <span className={styles.statLabel}>brouillons</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: 'var(--accent-purple)' }}>{courses.length}</span>
          <span className={styles.statLabel}>cours ({publishedCourses} publiés)</span>
        </div>
      </div>

      <section style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Derniers posts
          </h2>
          <Link href="/admin/posts/new" className={styles.btnPrimary}>+ Nouveau</Link>
        </div>

        {posts.length === 0 ? (
          <p className={styles.empty}>Aucun post. Crée ton premier post.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Statut</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {posts.slice(0, 6).map(post => (
                <tr key={post.source === 'db' ? post.id : `fs-${post.slug}`}>
                  <td>
                    {post.source === 'db' ? (
                      <Link href={`/admin/posts/${post.id}`} style={{ color: 'var(--text-heading)' }}>
                        {post.title}
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--text-heading)' }}>
                        {post.title}{' '}
                        <span className={`${styles.badge} ${styles.badgeFs}`}>.md</span>
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${post.source === 'fs' || post.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>
                      {post.source === 'fs' ? 'published' : post.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {formatDate(post.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {posts.length > 6 && (
          <p style={{ marginTop: '0.75rem', textAlign: 'right' }}>
            <Link href="/admin/posts" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              Voir tous les posts ({posts.length}) →
            </Link>
          </p>
        )}
      </section>

      {courses.length > 0 && (
        <section style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Cours récents
            </h2>
            <Link href="/admin/cours/new" className={styles.btnPrimary}>+ Nouveau cours</Link>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Titre</th>
                <th>Leçons</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {courses.slice(0, 4).map(course => (
                <tr key={course.id}>
                  <td>
                    <Link href={`/admin/cours/${course.id}`} style={{ color: 'var(--text-heading)' }}>
                      {course.title}
                    </Link>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {course.lessons.length} leçon{course.lessons.length !== 1 ? 's' : ''}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${course.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>
                      {course.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
