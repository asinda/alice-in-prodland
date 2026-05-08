import Link from 'next/link';
import { getAllPosts, PostMeta } from '../lib/posts';
import styles from '../styles/Home.module.css';

const TAG_COLORS: Record<string, string> = {
  kubernetes: 'blue',
  'github-actions': 'purple',
  SRE: 'green',
  CI_CD: 'purple',
  devops: 'orange',
  debugging: 'yellow',
  OOM: 'red',
  cheatsheet: 'blue',
  postmortem: 'red',
  incidents: 'red',
  postgresql: 'orange',
  CKA: 'green',
  certification: 'green',
  career: 'yellow',
  kubectl: 'blue',
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag] ?? 'default';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Home() {
  const posts = getAllPosts();
  const featured: PostMeta | undefined = posts[0];
  const recent = posts.slice(1, 4);

  return (
    <>
      {/* Hero */}
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
            <p className={styles.terminalOutput}>alice — SRE / DevOps engineer</p>
            <p className={styles.terminalLine}>
              <span className={styles.prompt}>➜</span>{' '}
              <span className={styles.cmd}>cat mission.txt</span>
            </p>
            <p className={styles.terminalOutput}>
              Survivre en production, apprendre de chaque incident,
            </p>
            <p className={styles.terminalOutput}>
              et documenter les rabbit holes pour les prochains.
            </p>
            <p className={styles.terminalLine}>
              <span className={styles.prompt}>➜</span>{' '}
              <span className={styles.cmd}>ls topics/</span>
            </p>
            <p className={styles.terminalOutput}>
              kubernetes/&nbsp;&nbsp;SRE/&nbsp;&nbsp;CI-CD/&nbsp;&nbsp;postmortems/&nbsp;&nbsp;certifications/
            </p>
            <p className={styles.terminalCursor}>
              <span className={styles.prompt}>➜</span>{' '}
              <span className={styles.blinkCursor}>▌</span>
            </p>
          </div>
        </div>
      </section>

      {/* Featured post */}
      {featured && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>★</span> Article récent
          </h2>
          <Link href={`/blog/${featured.slug}`} className={styles.featuredCard}>
            <div className={styles.featuredMeta}>
              <span className={styles.featuredDate}>{formatDate(featured.date)}</span>
              <span className={styles.readTime}>{featured.readTime} min de lecture</span>
            </div>
            <h3 className={styles.featuredTitle}>{featured.title}</h3>
            <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
            <div className={styles.tagList}>
              {featured.tags.map(tag => (
                <span key={tag} className={styles.tag} data-color={tagColor(tag)}>
                  {tag}
                </span>
              ))}
            </div>
            <span className={styles.readMore}>Lire l'article →</span>
          </Link>
        </section>
      )}

      {/* Recent posts */}
      {recent.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>#</span> Articles récents
          </h2>
          <div className={styles.postGrid}>
            {recent.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.postCard}>
                <div className={styles.postMeta}>
                  <span className={styles.postDate}>{formatDate(post.date)}</span>
                  <span className={styles.readTime}>{post.readTime} min</span>
                </div>
                <h3 className={styles.postTitle}>{post.title}</h3>
                <p className={styles.postExcerpt}>{post.excerpt}</p>
                <div className={styles.tagList}>
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={styles.tag} data-color={tagColor(tag)}>
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className={styles.viewAll}>
        <Link href="/blog" className={styles.viewAllBtn}>
          Voir tous les articles →
        </Link>
      </div>
    </>
  );
}
