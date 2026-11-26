'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { openFollow } from './FollowDialog';
import styles from '../styles/Follow.module.css';

const KEY = 'cl:follow-dismissed';

/** Fin d'article : une invitation discrète à suivre, affichée une seule fois par session, une fois la lecture bien avancée. */
export default function FollowPrompt() {
  const t = useTranslations('follow');
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (sessionStorage.getItem(KEY)) return; } catch { /* stockage indisponible */ }
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      if (total > 0 && doc.scrollTop / total > 0.65) setShow(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const dismiss = () => {
    setShow(false);
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignoré */ }
  };

  if (!show) return null;
  return (
    <aside className={styles.prompt} aria-label={t('title')}>
      <p>{t('prompt')}</p>
      <button type="button" className={styles.promptBtn} onClick={() => { openFollow(); dismiss(); }}>{t('button')}</button>
      <button type="button" className={styles.promptClose} aria-label={t('dismiss')} onClick={dismiss}>×</button>
    </aside>
  );
}
