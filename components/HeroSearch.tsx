'use client';

import { useTranslations } from 'next-intl';
import { SEARCH_EVENT } from './SearchPalette';
import styles from '../styles/Editorial.module.css';

/** Faux champ de recherche du hero : ouvre la palette de recherche (même raccourci que « / »). */
export default function HeroSearch({ count }: { count: number }) {
  const t = useTranslations('home');
  return (
    <button type="button" className={styles.heroSearch} onClick={() => window.dispatchEvent(new Event(SEARCH_EVENT))}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
      <span className={styles.heroSearchText}>{t('searchHero', { n: count })}</span>
      <kbd>/</kbd>
    </button>
  );
}
