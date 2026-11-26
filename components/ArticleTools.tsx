'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { addHistory, parse, savedSnapshot, serverSnapshot, subscribe, toggleSaved } from '../lib/reading-store';
import styles from '../styles/ArticleTools.module.css';

/** Enregistre la visite dans l'historique local. */
export function HistoryTracker({ slug }: { slug: string }) {
  useEffect(() => { addHistory(slug); }, [slug]);
  return null;
}

export function SaveButton({ slug }: { slug: string }) {
  const t = useTranslations('tools');
  const saved = parse(useSyncExternalStore(subscribe, savedSnapshot, serverSnapshot)).some(e => e.slug === slug);
  return (
    <button type="button" className={styles.btn} aria-pressed={saved} onClick={() => toggleSaved(slug)}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 4h12v17l-6-4-6 4z" />
      </svg>
      {saved ? t('saved') : t('save')}
    </button>
  );
}

export function ShareBar({ url, title }: { url: string; title: string }) {
  const t = useTranslations('tools');
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const ti = encodeURIComponent(title);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => { /* presse-papiers refusé */ });
  };

  return (
    <div className={styles.share} role="group" aria-label={t('share')}>
      <span className={styles.shareLabel}>{t('share')}</span>
      <a className={styles.btn} href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`} target="_blank" rel="noopener noreferrer">
        LinkedIn<span className="sr-only"> {t('newTab')}</span>
      </a>
      <a className={styles.btn} href={`https://twitter.com/intent/tweet?url=${u}&text=${ti}`} target="_blank" rel="noopener noreferrer">
        X<span className="sr-only"> {t('newTab')}</span>
      </a>
      <a className={styles.btn} href={`mailto:?subject=${ti}&body=${u}`}>{t('email')}</a>
      <button type="button" className={styles.btn} onClick={copy}>
        {copied ? t('linkCopied') : t('copyLink')}
      </button>
      <span className="sr-only" role="status">{copied ? t('linkCopied') : ''}</span>
    </div>
  );
}

export function BackToTop() {
  const t = useTranslations('tools');
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      className={styles.top}
      aria-label={t('top')}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  );
}
