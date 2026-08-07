import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getAllPosts, getPost, renderMarkdown } from '../../../../lib/posts';
import { getPostBySlug } from '../../../../lib/db';
import { getTranslation } from '../../../../lib/translations';
import { routing } from '../../../../i18n/routing';
import TableOfContents from '../../../../components/TableOfContents';
import CopyCode from '../../../../components/CopyCode';
import styles from '../../../../styles/Post.module.css';

const TAG_COLORS: Record<string, string> = {
  kubernetes: 'blue', 'github-actions': 'purple', SRE: 'green',
  devops: 'orange', debugging: 'yellow', OOM: 'red',
  cheatsheet: 'blue', postmortem: 'red', incidents: 'red',
  postgresql: 'orange', CKA: 'green', certification: 'green',
  career: 'yellow', kubectl: 'blue',
};

function tagColor(tag: string) { return TAG_COLORS[tag] ?? 'default'; }

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    for (const post of getAllPosts()) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string; slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  return { title: `${post.title} — alice-in-prodland`, description: post.excerpt };
}

export default async function BlogPost(
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';
  const post = await getPost(slug);

  // Use English translation if available and locale is EN
  let displayTitle = post.title;
  let displayExcerpt = post.excerpt;
  let contentHtml = post.contentHtml;
  let toc = post.toc;

  if (locale === 'en') {
    const dbPost = getPostBySlug(slug);
    const fsTranslation = !dbPost ? getTranslation(slug) : null;
    const enContent = dbPost?.contentEn ?? fsTranslation?.contentEn;
    if (enContent) {
      displayTitle   = dbPost?.titleEn   ?? fsTranslation?.titleEn   ?? post.title;
      displayExcerpt = dbPost?.excerptEn ?? fsTranslation?.excerptEn ?? post.excerpt;
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
              <time className={styles.date}>{formatDate(post.date)}</time>
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
            <TableOfContents toc={toc} />
          </aside>
        )}
      </div>

      <CopyCode contentId="post-content" />

      <div className={styles.footer}>
        <Link href={`/${locale}/blog`} className={styles.backBtn}>{t('backAll')}</Link>
      </div>
    </>
  );
}
