import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getCourseBySlug } from '../../../../../lib/db';
import { getCourseTranslation } from '../../../../../lib/courseTranslations';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import styles from '../../../../../styles/Cours.module.css';

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string; lesson: string }> }
): Promise<Metadata> {
  const { slug, lesson: lessonSlug } = await params;
  const course = getCourseBySlug(slug);
  const lesson = course?.lessons.find(l => l.slug === lessonSlug);
  if (!lesson) return {};
  return { title: `${lesson.title} — ${course!.title} — alice-in-prodland` };
}

export default async function LessonPage(
  { params }: { params: Promise<{ locale: string; slug: string; lesson: string }> }
) {
  await connection();
  const { locale, slug, lesson: lessonSlug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  const course = getCourseBySlug(slug);
  if (!course || course.status !== 'published') notFound();

  const sortedLessons = [...course.lessons].sort((a, b) => a.order - b.order);
  const lessonIndex = sortedLessons.findIndex(l => l.slug === lessonSlug);
  if (lessonIndex === -1) notFound();

  const lesson = sortedLessons[lessonIndex];
  const prev = sortedLessons[lessonIndex - 1];
  const next = sortedLessons[lessonIndex + 1];

  const courseTrans = locale === 'en' ? getCourseTranslation(slug) : null;
  const lessonTrans = courseTrans?.lessons?.[lessonSlug];
  const displayTitle = lessonTrans?.titleEn || lesson.title;
  const displayCourseTitle = courseTrans?.titleEn || course.title;
  const contentSource = lessonTrans?.contentEn || lesson.content;

  const prevTrans = prev && courseTrans?.lessons?.[prev.slug];
  const nextTrans = next && courseTrans?.lessons?.[next.slug];

  const contentHtml = String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .use(rehypeHighlight, { ignoreMissing: true } as any)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(contentSource)
  );

  return (
    <>
      <div className={styles.lessonHeader}>
        <Link href={`/${locale}/cours/${slug}`} className={styles.backLink}>← {displayCourseTitle}</Link>
        <span className={styles.lessonBreadcrumb}>
          {t('lessonOf')} {lessonIndex + 1} {t('of')} {sortedLessons.length}
        </span>
      </div>

      <article>
        <h1 className={styles.lessonTitle}>{displayTitle}</h1>
        <div
          className={styles.lessonContent}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>

      <nav className={styles.lessonPager}>
        {prev ? (
          <Link href={`/${locale}/cours/${slug}/${prev.slug}`} className={styles.pagerLink}>
            ← {prevTrans?.titleEn || prev.title}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/${locale}/cours/${slug}/${next.slug}`} className={styles.pagerLink}>
            {nextTrans?.titleEn || next.title} →
          </Link>
        ) : (
          <Link href={`/${locale}/cours/${slug}`} className={styles.pagerLink}>
            {t('end')}
          </Link>
        )}
      </nav>
    </>
  );
}
