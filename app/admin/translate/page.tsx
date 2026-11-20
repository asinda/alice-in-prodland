import styles from '../../../styles/Admin.module.css';
import { getAllAdminPosts } from '../../../lib/posts';
import { getPosts } from '../../../lib/db';
import { getAllTranslations, getTranslation } from '../../../lib/translations';
import { getFsPostRaw } from '../../../lib/posts';
import { checkTranslationConsistency } from '../../../lib/agents/consistency';
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
    let issues: string[] = [];
    if (hasEn) {
      const fr = p.source === 'db' ? dbPost?.content : getFsPostRaw(p.slug)?.content;
      const en = p.source === 'db' ? dbPost?.contentEn : getTranslation(p.slug)?.contentEn;
      if (fr && en) issues = checkTranslationConsistency(fr, en).map(i => `${i.severity === 'error' ? '✗' : '⚠'} ${i.message}`);
    }
    return {
      issues,
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
