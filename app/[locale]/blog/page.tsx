import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getAllPosts } from '../../../lib/posts';
import styles from '../../../styles/Blog.module.css';

const TAG_COLORS: Record<string, string> = {
  kubernetes: 'blue', 'github-actions': 'purple', SRE: 'green',
  devops: 'orange', debugging: 'yellow', OOM: 'red',
  cheatsheet: 'blue', postmortem: 'red', incidents: 'red',
  postgresql: 'orange', CKA: 'green', certification: 'green',
  career: 'yellow', kubectl: 'blue',
};

function tagColor(tag: string) { return TAG_COLORS[tag] ?? 'default'; }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return { title: `${t('title')} — alice-in-prodland` };
}

export default async function BlogIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const posts = getAllPosts();

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.slash}>/</span>{t('title')}
        </h1>
        <p className={styles.subtitle}>
          {posts.length} {t('subtitle')}
        </p>
      </div>

      <div className={styles.postList}>
        {posts.map(post => (
          <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className={styles.postRow}>
            <div className={styles.postLeft}>
              <span className={styles.postDate}>{formatDate(post.date)}</span>
            </div>
            <div className={styles.postRight}>
              <h2 className={styles.postTitle}>{post.title}</h2>
              <p className={styles.postExcerpt}>{post.excerpt}</p>
              <div className={styles.postFooter}>
                <div className={styles.tagList}>
                  {post.tags.slice(0, 4).map(tag => (
                    <span key={tag} className={styles.tag} data-color={tagColor(tag)}>{tag}</span>
                  ))}
                </div>
                <span className={styles.readTime}>{post.readTime} min</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
