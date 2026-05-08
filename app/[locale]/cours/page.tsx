import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getCourses } from '../../../lib/db';
import styles from '../../../styles/Cours.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'courses' });
  return { title: `${t('title')} — alice-in-prodland` };
}

export default async function CoursIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  const courses = getCourses({ status: 'published' });

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>
          <span className={styles.slash}>/</span>{t('title')}
        </h1>
        <p className={styles.pageSubtitle}>{t('subtitle')}</p>
      </div>

      <div className={styles.courseGrid}>
        {courses.map(course => {
          const count = course.lessons.length;
          const label = count === 1 ? t('lessons') : t('lessonsPlural');
          return (
            <Link key={course.id} href={`/${locale}/cours/${course.slug}`} className={styles.courseCard}>
              <div className={styles.courseIcon}>◈</div>
              <h2 className={styles.courseTitle}>{course.title}</h2>
              {course.description && <p className={styles.courseDesc}>{course.description}</p>}
              <div className={styles.courseMeta}>
                <span className={styles.lessonCount}>{count} {label}</span>
              </div>
              {course.tags.length > 0 && (
                <div className={styles.tagList}>
                  {course.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
              <span className={styles.startLink}>{t('start')}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
