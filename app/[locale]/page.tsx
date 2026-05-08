import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getAllPosts, PostMeta } from '../../lib/posts';
import styles from '../../styles/Home.module.css';

const TAG_COLORS: Record<string, string> = {
  kubernetes: 'blue', 'github-actions': 'purple', SRE: 'green',
  devops: 'orange', debugging: 'yellow', OOM: 'red',
  cheatsheet: 'blue', postmortem: 'red', incidents: 'red',
  postgresql: 'orange', CKA: 'green', certification: 'green',
  career: 'yellow', kubectl: 'blue',
};

function tagColor(tag: string) { return TAG_COLORS[tag] ?? 'default'; }

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });

  const dateLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const posts = getAllPosts();
  const featured: PostMeta | undefined = posts[0];
  const recent = posts.slice(1, 4);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroTerminal}>
          <div className={styles.terminalBar}>
            <span className={styles.dot} data-color="red" />
            <span className={styles.dot} data-color="yellow" />
            <span className={styles.dot} data-color="green" />
            <span className={styles.terminalTitle}>alice@prodland ~ $</span>
          </div>
          <div className={styles.terminalBody}>
            <p className={styles.terminalLine}>
              <span className={styles.prompt}>➜</span>{' '}
              <span className={styles.cmd}>whoami</span>
            </p>
            <p className={styles.terminalOutput}>{t('whoami')}</p>
            <p className={styles.terminalLine}>
              <span className={styles.prompt}>➜</span>{' '}
              <span className={styles.cmd}>cat mission.txt</span>
            </p>
            <p className={styles.terminalOutput}>{t('mission1')}</p>
            <p className={styles.terminalOutput}>{t('mission2')}</p>
            <p className={styles.terminalLine}>
              <span className={styles.prompt}>➜</span>{' '}
              <span className={styles.cmd}>ls topics/</span>
            </p>
            <p className={styles.terminalOutput}>{t('topics')}</p>
            <p className={styles.terminalCursor}>
              <span className={styles.prompt}>➜</span>{' '}
              <span className={styles.blinkCursor}>▌</span>
            </p>
          </div>
        </div>
      </section>

      {featured && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>★</span> {t('featured')}
          </h2>
          <Link href={`/${locale}/blog/${featured.slug}`} className={styles.featuredCard}>
            <div className={styles.featuredMeta}>
              <span className={styles.featuredDate}>{formatDate(featured.date)}</span>
              <span className={styles.readTime}>{featured.readTime} {t('readTime')}</span>
            </div>
            <h3 className={styles.featuredTitle}>{featured.title}</h3>
            <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
            <div className={styles.tagList}>
              {featured.tags.map(tag => (
                <span key={tag} className={styles.tag} data-color={tagColor(tag)}>{tag}</span>
              ))}
            </div>
            <span className={styles.readMore}>{t('readMore')}</span>
          </Link>
        </section>
      )}

      {recent.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>#</span> {t('recent')}
          </h2>
          <div className={styles.postGrid}>
            {recent.map(post => (
              <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className={styles.postCard}>
                <div className={styles.postMeta}>
                  <span className={styles.postDate}>{formatDate(post.date)}</span>
                  <span className={styles.readTime}>{post.readTime} min</span>
                </div>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.postExcerpt}>{post.excerpt}</p>
                <div className={styles.tagList}>
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={styles.tag} data-color={tagColor(tag)}>{tag}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className={styles.viewAll}>
        <Link href={`/${locale}/blog`} className={styles.viewAllBtn}>{t('viewAll')}</Link>
      </div>
    </>
  );
}
