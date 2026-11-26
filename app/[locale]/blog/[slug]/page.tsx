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
import NewsletterForm from '../../../../components/NewsletterForm';
import { getLocalizedPosts } from '../../../../lib/localized-posts';
import { relatedPosts, categoriesOf } from '../../../../lib/categories';
import AuthorBox from '../../../../components/AuthorBox';
import FollowPrompt from '../../../../components/FollowPrompt';
import Cover from '../../../../components/Cover';
import { HistoryTracker, SaveButton, ShareBar, BackToTop } from '../../../../components/ArticleTools';
import { applyCallouts } from '../../../../lib/callouts';
import edit from '../../../../styles/Editorial.module.css';
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
    title: `${title} — Jambo`,
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
  const tHome = await getTranslations({ locale, namespace: 'home' });
  const tCat = await getTranslations({ locale, namespace: 'categories' });
  const tNl = await getTranslations({ locale, namespace: 'newsletter' });
  const tTools = await getTranslations({ locale, namespace: 'tools' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });

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

  contentHtml = applyCallouts(contentHtml, {
    note: tTools('callout.note'), tip: tTools('callout.tip'), warning: tTools('callout.warning'), important: tTools('callout.important'),
  });
  const articleUrl = `${SITE_URL}/${locale}/blog/${slug}`;
  const allPosts = getLocalizedPosts(locale);
  const related = relatedPosts({ slug, tags: post.tags }, allPosts);
  const categories = categoriesOf(post.tags);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <>
      <nav className={styles.backLink} aria-label={tTools('breadcrumb')}>
        <Link href={`/${locale}`}>{tNav('home')}</Link> <span aria-hidden="true">/</span>{' '}
        <Link href={`/${locale}/blog`}>{tNav('blog')}</Link>
      </nav>
      <HistoryTracker slug={slug} />

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
            <div className={edit.articleActions}><SaveButton slug={slug} /></div>
            <div className={edit.articleCover}><Cover category={categories[0]} label={tCat(`${categories[0]}.name`)} /></div>
            <details className={edit.mobileToc}>
              <summary>{tToc('title')}</summary>
              <TableOfContents toc={toc} title={tToc('title')} label={tToc('label')} />
            </details>
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

          <div className={edit.shareRow}><ShareBar url={articleUrl} title={displayTitle} /></div>
          <AuthorBox locale={locale} />

          {related.length > 0 && (
            <aside className={edit.related} aria-labelledby="related-title">
              <h2 id="related-title" className={edit.relatedTitle}>{tHome('related')}</h2>
              <ul className={edit.relatedList}>
                {related.map(r => (
                  <li key={r.slug}>
                    <Link href={`/${locale}/blog/${r.slug}`} className={edit.relatedLink}>
                      <span className={edit.relatedName}>{r.title}</span>
                      <span className={edit.relatedMeta}>{r.date.slice(0, 10)} · {r.readTime} {t('readTime')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <aside className={edit.inlineNl}>
            <h2 className={edit.relatedTitle}>{tNl('title')}</h2>
            <p>{tNl('text')}</p>
            <NewsletterForm locale={locale} source="article" />
          </aside>
        </article>

        {toc.length > 0 && (
          <aside className={styles.tocSidebar}>
            <TableOfContents toc={toc} title={tToc('title')} label={tToc('label')} />
          </aside>
        )}
      </div>

      <FollowPrompt />
      <BackToTop />
      <CopyCode contentId="post-content" copyLabel={tCode('copy')} copiedLabel={tCode('copied')} ariaLabel={tCode('copyAria')} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: tNav('home'), item: `${SITE_URL}/${locale}` },
          { '@type': 'ListItem', position: 2, name: tNav('blog'), item: `${SITE_URL}/${locale}/blog` },
          { '@type': 'ListItem', position: 3, name: displayTitle, item: articleUrl },
        ],
      }} />
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
