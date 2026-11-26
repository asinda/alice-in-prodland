import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getLocalizedPosts } from '../../../lib/localized-posts';
import { SITE_NAME } from '../../../lib/site';
import LibraryClient from '../../../components/LibraryClient';
import type { CardPost } from '../../../components/PostCard';
import styles from '../../../styles/Editorial.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'library' });
  return { title: `${t('title')} — ${SITE_NAME}`, robots: { index: false } };
}

export default async function Library({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'library' });
  const posts: CardPost[] = getLocalizedPosts(locale).map(p => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, tags: p.tags,
    dateLabel: p.date.slice(0, 10), readTime: p.readTime, level: p.level,
  }));
  return (
    <>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <p className={styles.pageLead}>{t('lead')}</p>
      </header>
      <LibraryClient posts={posts} locale={locale} />
    </>
  );
}
