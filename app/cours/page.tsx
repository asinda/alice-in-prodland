import type { Metadata } from 'next';
import Link from 'next/link';
import { getCourses } from '../../lib/db';
import styles from '../../styles/Cours.module.css';

export const metadata: Metadata = {
  title: 'Cours — alice-in-prodland',
  description: 'Cours pratiques sur Kubernetes, SRE, CI/CD et le DevOps.',
};

export default function CoursPage() {
  const courses = getCourses({ status: 'published' });

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}><span className={styles.slash}>/</span>cours</h1>
        <p className={styles.subtitle}>{courses.length} cours · Kubernetes, SRE, CI/CD</p>
      </div>

      {courses.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Aucun cours disponible pour l'instant. Reviens bientôt.
        </p>
      ) : (
        <div className={styles.grid}>
          {courses.map(course => (
            <Link key={course.id} href={`/cours/${course.slug}`} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>◈</span>
                <span className={styles.lessonCount}>
                  {course.lessons.length} leçon{course.lessons.length !== 1 ? 's' : ''}
                </span>
              </div>
              <h2 className={styles.cardTitle}>{course.title}</h2>
              {course.description && (
                <p className={styles.cardDesc}>{course.description}</p>
              )}
              {course.tags.length > 0 && (
                <div className={styles.tagList}>
                  {course.tags.slice(0, 4).map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
              <span className={styles.cardCta}>Commencer →</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
