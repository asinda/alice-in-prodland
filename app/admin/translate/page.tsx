import styles from '../../../styles/Admin.module.css';
import { getAllAdminPosts } from '../../../lib/posts';
import { getPosts } from '../../../lib/db';
import { getAllTranslations } from '../../../lib/translations';
import TranslateClient from './TranslateClient';

export default function TranslatePage() {
  const adminPosts = getAllAdminPosts();
  const dbPosts = getPosts();
  const translations = getAllTranslations();

  const rows = adminPosts.map(p => {
    const dbPost = dbPosts.find(d => d.slug === p.slug);
    const hasEn = p.source === 'db'
      ? !!(dbPost?.contentEn)
      : !!(translations[p.slug]);
    return {
      slug: p.slug,
      title: p.title,
      source: p.source as 'fs' | 'db',
      hasEn,
    };
  });

  const translated = rows.filter(r => r.hasEn).length;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>~</span> Traductions EN</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {translated}/{rows.length}
        </span>
      </div>
      <TranslateClient posts={rows} />
    </>
  );
}
