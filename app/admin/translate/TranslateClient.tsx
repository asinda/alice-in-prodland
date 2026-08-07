'use client';

import { useState, useTransition } from 'react';
import { actionTranslateAll, actionTranslateOne, type TranslateAllResult } from '../../../lib/actions/translate';
import styles from '../../../styles/Admin.module.css';

interface PostRow {
  slug: string;
  title: string;
  source: 'fs' | 'db';
  hasEn: boolean;
}

export default function TranslateClient({ posts }: { posts: PostRow[] }) {
  const [result, setResult] = useState<TranslateAllResult | null>(null);
  const [isBusy, startBusy] = useTransition();
  const [singleMsg, setSingleMsg] = useState<Record<string, string>>({});

  function translateAll() {
    setResult(null);
    startBusy(async () => {
      const r = await actionTranslateAll();
      setResult(r);
    });
  }

  function translateOne(slug: string, source: 'fs' | 'db') {
    setSingleMsg(m => ({ ...m, [slug]: '...' }));
    startBusy(async () => {
      const r = await actionTranslateOne(slug, source);
      setSingleMsg(m => ({ ...m, [slug]: r.error ? `Erreur : ${r.error}` : 'Traduit ✓' }));
    });
  }

  const total = posts.length;
  const translated = posts.filter(p => p.hasEn).length;

  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {translated}/{total} traduits en anglais
        </span>
        <button
          className={styles.btnPrimary}
          onClick={translateAll}
          disabled={isBusy}
        >
          {isBusy ? 'Traduction en cours...' : `Traduire tout (${total - translated} restants)`}
        </button>
      </div>

      {result && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          <p style={{ color: 'var(--accent-green)' }}>✓ {result.done.length} traduits</p>
          <p style={{ color: 'var(--text-muted)' }}>⊘ {result.skipped.length} déjà traduits (ignorés)</p>
          {result.errors.length > 0 && (
            <p style={{ color: 'var(--accent-red)' }}>✗ {result.errors.length} erreurs : {result.errors.map(e => e.slug).join(', ')}</p>
          )}
        </div>
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Titre</th>
            <th>Source</th>
            <th>EN</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(post => (
            <tr key={post.slug}>
              <td style={{ color: 'var(--text-heading)' }}>{post.title}</td>
              <td>
                <span className={`${styles.badge} ${post.source === 'fs' ? styles.badgeFs : styles.badgeDraft}`}>
                  {post.source}
                </span>
              </td>
              <td>
                {post.hasEn
                  ? <span className={`${styles.badge} ${styles.badgePublished}`}>✓ EN</span>
                  : <span className={`${styles.badge} ${styles.badgeDraft}`}>— FR only</span>
                }
              </td>
              <td>
                {singleMsg[post.slug] ? (
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-green)' }}>{singleMsg[post.slug]}</span>
                ) : (
                  <button
                    className={styles.btnSecondary}
                    style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
                    disabled={isBusy}
                    onClick={() => translateOne(post.slug, post.source)}
                  >
                    {post.hasEn ? 'Re-traduire' : 'Traduire →EN'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
