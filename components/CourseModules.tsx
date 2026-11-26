import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCourses } from '../lib/db';
import { getCourseTranslation } from '../lib/courseTranslations';
import styles from '../styles/Modules.module.css';

/** Cours présentés comme des « modules de formation » : une barre segmentée = une leçon par segment. */
export default async function CourseModules({ locale, limit }: { locale: string; limit?: number }) {
  const t = await getTranslations({ locale, namespace: 'courses' });
  const courses = getCourses({ status: 'published' })
    .map(c => {
      if (locale !== 'en') return c;
      const tr = getCourseTranslation(c.slug);
      return { ...c, title: tr?.titleEn || c.title, description: tr?.descriptionEn || c.description };
    })
    .slice(0, limit);

  if (courses.length === 0) return <p className={styles.empty}>{t('empty')}</p>;

  return (
    <ul className={styles.list}>
      {courses.map(c => {
        const n = c.lessons.length;
        return (
          <li key={c.id}>
            <Link href={`/${locale}/cours/${c.slug}`} className={styles.module}>
              <span className={styles.title}>{c.title}</span>
              <span className={styles.meta}>
                {t('lessonCount', { n })}{c.tags.length > 0 ? ` · ${c.tags.slice(0, 3).join(' · ')}` : ''}
              </span>
              {c.description && <span className={styles.desc}>{c.description}</span>}
              <span className={styles.seg} aria-hidden="true">
                {Array.from({ length: Math.min(n, 24) }, (_, i) => <i key={i} />)}
              </span>
              <span className={styles.go}>{t('start')}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
