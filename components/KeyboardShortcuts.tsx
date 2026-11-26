'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setTheme } from '../lib/theme-client';
import styles from '../styles/Shortcuts.module.css';

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
};

const GO: Record<string, string> = { h: '', b: '/blog', l: '/bibliotheque', g: '/glossaire' };

/** Raccourcis clavier pour un public technique : ? aide · t thème · g puis h/b/l/g navigation. (/ et Ctrl+K : recherche, voir SearchPalette.) */
export default function KeyboardShortcuts({ locale }: { locale: string }) {
  const t = useTranslations('shortcuts');
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let pendingG = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector('dialog[open]')) return;
      const k = e.key;
      if (pendingG && Date.now() - pendingG < 1200 && k in GO) {
        pendingG = 0;
        router.push(`/${locale}${GO[k]}`);
        return;
      }
      pendingG = 0;
      if (k === '?') { e.preventDefault(); dialogRef.current?.showModal(); }
      else if (k === 't') {
        const set = document.documentElement.dataset.theme;
        const current = set === 'light' || set === 'dark' ? set : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(current === 'dark' ? 'light' : 'dark');
      } else if (k === 'g') pendingG = Date.now();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locale, router]);

  const rows: [string, string][] = [
    ['/  ·  Ctrl K', t('search')], ['t', t('theme')], ['g h', t('goHome')], ['g b', t('goBlog')],
    ['g l', t('goLibrary')], ['g g', t('goGlossary')], ['?', t('help')],
  ];

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="shortcuts-title"
      onClick={e => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}
    >
      <div className={styles.inner}>
        <h2 id="shortcuts-title" className={styles.title}>{t('title')}</h2>
        <dl className={styles.list}>
          {rows.map(([keys, label]) => (
            <div key={keys} className={styles.row}>
              <dt>{keys.split(/\s+/).filter(p => p !== '·').map((p, i) => <kbd key={i}>{p}</kbd>)}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()}>{t('close')}</button>
      </div>
    </dialog>
  );
}
