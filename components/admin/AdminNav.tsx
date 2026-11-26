'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { openAdminPalette } from './AdminPalette';
import styles from '../../styles/AdminShell.module.css';

export const ADMIN_MAIN = [
  { href: '/admin', label: "Aujourd'hui", icon: '◉', exact: true },
  { href: '/admin/posts', label: 'Articles', icon: '✦' },
  { href: '/admin/notes', label: 'Carnet', icon: '✎' },
  { href: '/admin/cours', label: 'Cours', icon: '◈' },
  { href: '/admin/obsidian', label: 'Importer', icon: '⇩' },
  { href: '/admin/schedule', label: 'Calendrier', icon: '◷' },
  { href: '/admin/social', label: 'Réseaux', icon: '↗' },
  { href: '/admin/leads', label: 'Abonnés', icon: '✉' },
  { href: '/admin/stats', label: 'Statistiques', icon: '▤' },
] as const;

/** Menu principal : neuf entrées. Le reste (import, traduction, relecture…) est dans la palette Ctrl K. */
export default function AdminNav() {
  const path = usePathname();
  return (
    <>
      <button type="button" className={styles.search} onClick={openAdminPalette}>
        <span aria-hidden="true">⌕</span> Aller à…<kbd>Ctrl K</kbd>
      </button>
      <nav className={styles.nav} aria-label="Administration">
        {ADMIN_MAIN.map(item => {
          const active = 'exact' in item && item.exact ? path === item.href : path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href} className={styles.link} aria-current={active ? 'page' : undefined}>
              <i aria-hidden="true">{item.icon}</i>{item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
