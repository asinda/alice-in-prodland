'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { applySavedTheme } from '../../lib/theme-client';
import styles from '../../styles/AdminShell.module.css';

/** Coque de l'administration. Sur la page de connexion, ni menu ni palette : rien n'est montré avant l'authentification. */
export default function AdminChrome({ side, palette, children }: { side: ReactNode; palette: ReactNode; children: ReactNode }) {
  const login = usePathname() === '/admin/login';
  useEffect(() => { applySavedTheme(); }, []);
  return (
    <div className={styles.shell} data-login={login ? 'true' : undefined}>
      {!login && side}
      <main className={styles.main}>{children}</main>
      {!login && palette}
    </div>
  );
}
