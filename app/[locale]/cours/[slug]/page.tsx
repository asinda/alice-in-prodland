import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getCourses, getCourseBySlug } from '../../../../lib/db';
import { routing } from '../../../../i18n/routing';
import styles from '../../../../styles/Cours.module.css';

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    for (const course of getCourses({ status: 'published' })) {
      params.push({ locale, slug: course.slug });
    }
  }
  return params;
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> }
): Promise<Metadata> {
  const { locale, slug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) return {};
  const t = await getTranslations({ locale, namespace: 'courses' });
  return { title: `${course.title} — ${t('title')} — alice-in-prodland`, description: course.description };
}

export default async function CoursDetail(
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  const course = getCourseBySlug(slug);
  if (!course || course.status !== 'published') notFound();

  const sortedLessons = [...course.lessons].sort((a, b) => a.order - b.order);
  const count = sortedLessons.length;
  const label = count === 1 ? t('lessons') : t('lessonsPlural');

  return (
    <>
      <div className={styles.backLink}>
        <Link href={`/${locale}/cours`}>{t('back')}</Link>
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
        <p className={styles.lessonCount}>{count} {label}</p>
      </header>

      <nav className={styles.lessonNav}>
        {sortedLessons.map((lesson, i) => (
          <Link key={lesson.id} href={`/${locale}/cours/${slug}/${lesson.slug}`} className={styles.lessonNavItem}>
            <span className={styles.lessonNum}>{i + 1}</span>
            <span className={styles.lessonNavTitle}>{lesson.title}</span>
            <span className={styles.lessonArrow}>→</span>
          </Link>
        ))}
      </nav>

      {sortedLessons.length > 0 && (
        <div className={styles.startCta}>
          <Link href={`/${locale}/cours/${slug}/${sortedLessons[0].slug}`} className={styles.startBtn}>
            {t('start')}
          </Link>
        </div>
      )}
    </>
  );
}
