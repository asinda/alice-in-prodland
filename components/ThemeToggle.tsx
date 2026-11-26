'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../styles/Layout.module.css';

const KEY = 'theme';

function effectiveTheme(): 'light' | 'dark' {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Bascule clair/sombre. Sans choix explicite, on suit le réglage du système. */
export default function ThemeToggle() {
  const t = useTranslations('a11y');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
    } catch { /* stockage indisponible : on garde le réglage système */ }
  }, []);

  const toggle = () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch { /* ignoré */ }
  };

  return (
    <button type="button" className={styles.iconBtn} onClick={toggle} aria-label={t('theme')} title={t('theme')}>
      <svg viewBox="0 0 24 24" className={styles.iconMoon} aria-hidden="true" focusable="false">
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" fill="currentColor" />
      </svg>
      <svg viewBox="0 0 24 24" className={styles.iconSun} aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="4.5" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
        </g>
      </svg>
    </button>
  );
}
