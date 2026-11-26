'use client';

import { useSyncExternalStore } from 'react';
import { effectiveTheme, setTheme, subscribeTheme, type Theme } from '../../lib/theme-client';
import styles from '../../styles/AdminShell.module.css';

const serverTheme = (): Theme => 'light';

/** Bascule clair/sombre de l'administration. Même mémoire que le site public. */
export default function AdminThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, effectiveTheme, serverTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className={className ?? styles.themeBtn}
      onClick={() => setTheme(next)}
      aria-label={next === 'light' ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={next === 'light' ? 'Thème clair' : 'Thème sombre'}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      {next === 'light' ? 'Thème clair' : 'Thème sombre'}
    </button>
  );
}
