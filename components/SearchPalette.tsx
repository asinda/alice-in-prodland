'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import layout from '../styles/Layout.module.css';
import styles from '../styles/Search.module.css';

export interface SearchItem {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
}

const MAX = 8;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function isTyping(el: EventTarget | null): boolean {
  const n = el as HTMLElement | null;
  if (!n) return false;
  return n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.isContentEditable;
}

/** Recherche instantanée : bouton visible dans l'en-tête, raccourcis « / » et Ctrl/⌘ + K. */
export const SEARCH_EVENT = 'cl:search';

export default function SearchPalette({ items, locale }: { items: SearchItem[]; locale: string }) {
  const t = useTranslations('search');
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const open = () => {
    setQuery('');
    setActive(0);
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  };
  const close = () => dialogRef.current?.close();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const combo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target);
      if (combo || slash) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(SEARCH_EVENT, open);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(SEARCH_EVENT, open); };
  }, []);

  const q = fold(query.trim());
  const results = useMemo(() => {
    const list = q
      ? items.filter(p => fold(`${p.title} ${p.excerpt} ${p.tags.join(' ')}`).includes(q))
      : items;
    return list.slice(0, MAX);
  }, [items, q]);

  const go = (slug: string) => {
    close();
    router.push(`/${locale}/blog/${slug}`);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Dans un champ « search », Échap vide d'abord le texte : on ferme directement.
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      go(results[active].slug);
    }
  };

  return (
    <>
      <button type="button" className={layout.searchBtn} onClick={open} aria-label={t('open')}>
        <svg viewBox="0 0 24 24" className={layout.searchIcon} aria-hidden="true" focusable="false">
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className={layout.searchLabel}>{t('open')}</span>
        <kbd className={layout.kbd} aria-hidden="true">/</kbd>
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={t('open')}
        onClick={e => { if (e.target === dialogRef.current) close(); }}
      >
        <div className={styles.panel}>
          <input
            ref={inputRef}
            type="search"
            className={styles.input}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onInputKey}
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `sr-${results[active].slug}` : undefined}
            autoComplete="off"
          />
          <p className={styles.group}>{q ? t('results') : t('latest')}</p>
          {results.length === 0 ? (
            <p className={styles.empty}>{t('empty')}</p>
          ) : (
            <ul id="search-results" role="listbox" className={styles.list}>
              {results.map((p, i) => (
                <li key={p.slug} id={`sr-${p.slug}`} role="option" aria-selected={i === active}>
                  <Link
                    href={`/${locale}/blog/${p.slug}`}
                    className={`${styles.item} ${i === active ? styles.itemActive : ''}`}
                    onClick={() => close()}
                    onMouseEnter={() => setActive(i)}
                    tabIndex={-1}
                  >
                    <span className={styles.itemTitle}>{p.title}</span>
                    <span className={styles.itemTags}>{p.tags.slice(0, 3).map(tag => `#${tag}`).join('  ')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.keys}>{t('keys')}</p>
          <button type="button" className={styles.close} onClick={close}>{t('close')}</button>
        </div>
      </dialog>
    </>
  );
}
