'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { openFollow } from './FollowDialog';
import styles from '../styles/Layout.module.css';

interface Props {
  locale: string;
  labels: { blog: string; library: string; courses: string; about: string; menu: string; close: string; follow: string };
  /** Recherche, thème, langue : rendus côté serveur, placés à droite. */
  children: ReactNode;
}

export default function SiteNav({ locale, labels, children }: Props) {
  const [menu, setMenu] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menu]);

  const closeAll = () => setMenu(false);
  const href = (p: string) => `/${locale}${p}`;

  return (
    <>
      <div className={styles.links}>
        <Link href={href('/blog')} className={styles.navLink} onClick={closeAll}>{labels.blog}</Link>
        <Link href={href('/cours')} className={styles.navLink} onClick={closeAll}>{labels.courses}</Link>
        <Link href={href('/bibliotheque')} className={styles.navLink} onClick={closeAll}>{labels.library}</Link>
        <Link href={href('/about')} className={styles.navLink} onClick={closeAll}>{labels.about}</Link>
      </div>

      <div className={styles.tools}>
        {children}
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.burger}`}
          aria-expanded={menu}
          aria-controls={panelId}
          aria-label={menu ? labels.close : labels.menu}
          onClick={() => setMenu(m => !m)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div id={panelId} className={styles.mobilePanel} hidden={!menu}>
        <Link href={href('/blog')} className={styles.mobileLink} onClick={closeAll}>{labels.blog}</Link>
        <Link href={href('/cours')} className={styles.mobileLink} onClick={closeAll}>{labels.courses}</Link>
        <Link href={href('/bibliotheque')} className={styles.mobileLink} onClick={closeAll}>{labels.library}</Link>
        <Link href={href('/about')} className={styles.mobileLink} onClick={closeAll}>{labels.about}</Link>
        <button type="button" className={styles.mobileFollow} onClick={() => { closeAll(); openFollow(); }}>{labels.follow}</button>
      </div>
    </>
  );
}
