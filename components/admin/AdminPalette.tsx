'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/AdminShell.module.css';

const EVENT = 'admin:palette';
export const openAdminPalette = () => window.dispatchEvent(new Event(EVENT));

interface Item { label: string; hint: string; href: string; external?: boolean }

const ITEMS: Item[] = [
  { label: 'Nouvelle idée', hint: 'carnet', href: '/admin/notes' },
  { label: 'Nouvel article', hint: 'créer', href: '/admin/posts/new' },
  { label: 'Carnet d’idées', hint: 'aller', href: '/admin/notes' },
  { label: 'Nouveau cours', hint: 'créer', href: '/admin/cours/new' },
  { label: 'Aujourd’hui', hint: 'aller', href: '/admin' },
  { label: 'Articles', hint: 'aller', href: '/admin/posts' },
  { label: 'Cours', hint: 'aller', href: '/admin/cours' },
  { label: 'Calendrier de publication', hint: 'aller', href: '/admin/schedule' },
  { label: 'Réseaux sociaux', hint: 'aller', href: '/admin/social' },
  { label: 'Relecture IA', hint: 'publication', href: '/admin/review' },
  { label: 'Traduction FR → EN', hint: 'publication', href: '/admin/translate' },
  { label: 'Importer une note Obsidian', hint: 'import', href: '/admin/obsidian' },
  { label: 'Abonnés', hint: 'aller', href: '/admin/leads' },
  { label: 'Statistiques', hint: 'aller', href: '/admin/stats' },
  { label: 'Terriers', hint: 'contenu', href: '/admin/terriers' },
  { label: 'Voir le site', hint: 'ouvrir', href: '/', external: true },
];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Palette de commandes (Ctrl K) : aller à une page, créer, lancer un outil. */
export default function AdminPalette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = fold(query.trim());
    return q ? ITEMS.filter(i => fold(`${i.label} ${i.hint}`).includes(q)) : ITEMS;
  }, [query]);

  const open = () => {
    setQuery('');
    setActive(0);
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    input.current?.focus();
  };
  const close = () => dialog.current?.close();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(EVENT, open);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(EVENT, open); };
  }, []);

  const go = (item: Item | undefined) => {
    if (!item) return;
    close();
    if (item.external) window.open(item.href, '_blank', 'noopener'); else router.push(item.href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
  };

  return (
    <dialog ref={dialog} className={styles.palette} aria-label="Palette de commandes" onClick={e => { if (e.target === dialog.current) close(); }}>
      <input
        ref={input}
        value={query}
        onChange={e => { setQuery(e.target.value); setActive(0); }}
        onKeyDown={onInputKey}
        placeholder="Aller à, créer, lancer…"
        aria-label="Rechercher une commande"
        className={styles.paletteInput}
      />
      <ul className={styles.paletteList} role="listbox">
        {results.map((item, i) => (
          <li key={item.label} role="option" aria-selected={i === active}>
            <button type="button" data-active={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(item)}>
              <span>{item.label}</span><small>{item.hint}</small>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className={styles.paletteEmpty}>Aucun résultat</li>}
      </ul>
    </dialog>
  );
}
