import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourses, getCourseBySlug } from '../../../lib/db';
import styles from '../../../styles/Cours.module.css';

export async function generateStaticParams() {
  return getCourses({ status: 'published' }).map(c => ({ slug: c.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) return {};
  return { title: `${course.title} — alice-in-prodland`, description: course.description };
}

export default async function CoursDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course || course.status !== 'published') notFound();

  const sortedLessons = [...course.lessons].sort((a, b) => a.order - b.order);

  return (
    <>
      <div className={styles.backLink}>
        <Link href="/cours">← Tous les cours</Link>
      </div>

      <header className={styles.courseHeader}>
        <div className={styles.courseIcon}>◈</div>
        <h1 className={styles.courseTitle}>{course.title}</h1>
        {course.description && <p className={styles.courseDesc}>{course.description}</p>}
        {course.tags.length > 0 && (
          <div className={styles.tagList}>
            {course.tags.map(tag => <span key={tag} className={styles.tag}>{tag}</span>)}
          </div>
        )}
        <p className={styles.lessonCount}>
          {sortedLessons.length} leçon{sortedLessons.length !== 1 ? 's' : ''}
        </p>
      </header>

      <nav className={styles.lessonNav}>
        {sortedLessons.map((lesson, i) => (
          <Link key={lesson.id} href={`/cours/${slug}/${lesson.slug}`} className={styles.lessonNavItem}>
            <span className={styles.lessonNum}>{i + 1}</span>
            <span className={styles.lessonNavTitle}>{lesson.title}</span>
            <span className={styles.lessonArrow}>→</span>
          </Link>
        ))}
      </nav>

      {sortedLessons.length > 0 && (
        <div className={styles.startCta}>
          <Link href={`/cours/${slug}/${sortedLessons[0].slug}`} className={styles.startBtn}>
            Commencer la première leçon →
          </Link>
        </div>
      )}
    </>
  );
}
