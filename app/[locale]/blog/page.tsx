import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getLocalizedPosts } from '../../../lib/localized-posts';
import { SITE_NAME } from '../../../lib/site';
import { kindOf } from '../../../lib/severity';
import TopicExplorer, { type ExplorerPost } from '../../../components/TopicExplorer';
import ed from '../../../styles/Editorial.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return { title: `${t('title')} — ${SITE_NAME}` };
}

export default async function BlogIndex({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ topic?: string }> }) {
  const { locale } = await params;
  const { topic } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });

  const posts: ExplorerPost[] = getLocalizedPosts(locale).map(p => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, tags: p.tags,
    dateLabel: p.date.slice(0, 10), kind: kindOf(p.tags), readTime: p.readTime, level: p.level,
  }));

  return (
    <>
      <header className={ed.pageHead}>
        <h1 className={ed.pageTitle}>{t('title')}</h1>
        <p className={ed.pageLead}>{t('subtitle')}</p>
      </header>
      <TopicExplorer posts={posts} locale={locale} limit={8} compact initialTopic={topic} />
    </>
  );
}
