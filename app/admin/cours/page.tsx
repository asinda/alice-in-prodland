import Link from 'next/link';
import { getCourses } from '../../../lib/db';
import { actionPublishCourse, actionDeleteCourse } from '../../../lib/actions/courses';
import styles from '../../../styles/Admin.module.css';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminCours() {
  const courses = getCourses();

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>◈</span> Cours</h1>
        <Link href="/admin/cours/new" className={styles.btnPrimary}>+ Nouveau cours</Link>
      </div>

      {courses.length === 0 ? (
        <p className={styles.empty}>Aucun cours. Crée ton premier cours.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Leçons</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
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
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {formatDate(course.createdAt)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href={`/admin/cours/${course.id}`} className={styles.btnSecondary}>Éditer</Link>
                    {course.status === 'draft' && (
                      <form action={actionPublishCourse.bind(null, course.id)} style={{ display: 'inline' }}>
                        <button type="submit" className={styles.btnGreen}>Publier</button>
                      </form>
                    )}
                    <form action={actionDeleteCourse.bind(null, course.id)} style={{ display: 'inline' }}>
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
