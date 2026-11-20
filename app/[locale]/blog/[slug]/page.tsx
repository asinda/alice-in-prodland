import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getPost, renderMarkdown } from '../../../../lib/posts';
import { getPostBySlug } from '../../../../lib/db';
import { getTranslation } from '../../../../lib/translations';
import TableOfContents from '../../../../components/TableOfContents';
import CopyCode from '../../../../components/CopyCode';
import JsonLd from '../../../../components/JsonLd';
import { SITE_URL } from '../../../../lib/site';
import styles from '../../../../styles/Post.module.css';

const TAG_COLORS: Record<string, string> = {
  kubernetes: 'blue', 'github-actions': 'purple', SRE: 'green',
  devops: 'orange', debugging: 'yellow', OOM: 'red',
  cheatsheet: 'blue', postmortem: 'red', incidents: 'red',
  postgresql: 'orange', CKA: 'green', certification: 'green',
  career: 'yellow', kubectl: 'blue',
};

function tagColor(tag: string) { return TAG_COLORS[tag] ?? 'default'; }

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> }
): Promise<Metadata> {
  const { locale, slug } = await params;
  let post;
  try { post = await getPost(slug); } catch { return {}; }

  let title = post.title;
  let description = post.excerpt;
  if (locale === 'en') {
    const fileTrans = getTranslation(slug);
    const dbPost = getPostBySlug(slug);
    if (fileTrans?.contentEn ?? dbPost?.contentEn) {
      title = fileTrans?.titleEn ?? dbPost?.titleEn ?? title;
      description = fileTrans?.excerptEn ?? dbPost?.excerptEn ?? description;
    }
  }

  const path = `/blog/${slug}`;
  return {
    title: `${title} — alice-in-prodland`,
    description,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: { fr: `/fr${path}`, en: `/en${path}`, 'x-default': `/fr${path}` },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      publishedTime: post.date,
      locale: locale === 'fr' ? 'fr_FR' : 'en_GB',
      images: [`/api/og/${slug}`],
    },
    twitter: { card: 'summary_large_image', title, description, images: [`/api/og/${slug}`] },
  };
}

export default async function BlogPost(
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  await connection();
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });
  const tToc = await getTranslations({ locale, namespace: 'toc' });
  const tCode = await getTranslations({ locale, namespace: 'code' });

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';
  let post;
  try { post = await getPost(slug); } catch { notFound(); }

  // Use English translation if available and locale is EN
  let displayTitle = post.title;
  let displayExcerpt = post.excerpt;
  let contentHtml = post.contentHtml;
  let toc = post.toc;

  if (locale === 'en') {
    // Always check posts/en/ first (works in prod regardless of volume state)
    const fileTrans = getTranslation(slug);
    const dbPost = getPostBySlug(slug);
    const enContent = fileTrans?.contentEn ?? dbPost?.contentEn;
    if (enContent) {
      displayTitle   = fileTrans?.titleEn   ?? dbPost?.titleEn   ?? post.title;
      displayExcerpt = fileTrans?.excerptEn ?? dbPost?.excerptEn ?? post.excerpt;
      const rendered = await renderMarkdown(enContent);
      contentHtml = rendered.contentHtml;
      toc = rendered.toc;
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <>
      <div className={styles.backLink}>
        <Link href={`/${locale}/blog`}>{t('back')}</Link>
      </div>

      <div className={toc.length > 0 ? styles.articleWrapper : undefined}>
        <article>
          <header className={styles.header}>
            <div className={styles.meta}>
              <time className={styles.date} dateTime={post.date}>{formatDate(post.date)}</time>
              <span className={styles.separator}>·</span>
              <span className={styles.readTime}>{post.readTime} {t('readTime')}</span>
            </div>
            <h1 className={styles.title}>{displayTitle}</h1>
            <p className={styles.excerpt}>{displayExcerpt}</p>
            <div className={styles.tagList}>
              {post.tags.map(tag => (
                <span key={tag} className={styles.tag} data-color={tagColor(tag)}>{tag}</span>
              ))}
            </div>
          </header>

          <div
            id="post-content"
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        </article>

        {toc.length > 0 && (
          <aside className={styles.tocSidebar}>
            <TableOfContents toc={toc} title={tToc('title')} label={tToc('label')} />
          </aside>
        )}
      </div>

      <CopyCode contentId="post-content" copyLabel={tCode('copy')} copiedLabel={tCode('copied')} ariaLabel={tCode('copyAria')} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: displayTitle,
        description: displayExcerpt,
        datePublished: post.date,
        inLanguage: locale,
        keywords: post.tags.join(', '),
        image: `${SITE_URL}/api/og/${slug}`,
        url: `${SITE_URL}/${locale}/blog/${slug}`,
        mainEntityOfPage: `${SITE_URL}/${locale}/blog/${slug}`,
        author: { '@type': 'Person', name: 'Alice Sindayigaya' },
        publisher: { '@type': 'Person', name: 'Alice Sindayigaya' },
      }} />

      <div className={styles.footer}>
        <Link href={`/${locale}/blog`} className={styles.backBtn}>{t('backAll')}</Link>
      </div>
    </>
  );
}
