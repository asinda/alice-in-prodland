'use client';

import { useRouter, usePathname } from 'next/navigation';
import styles from '../styles/Layout.module.css';

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }

  return (
    <div className={styles.langSwitcher}>
      <button
        onClick={() => switchLocale('fr')}
        className={`${styles.langBtn} ${currentLocale === 'fr' ? styles.langActive : ''}`}
      >
        FR
      </button>
      <span className={styles.langSep}>|</span>
      <button
        onClick={() => switchLocale('en')}
        className={`${styles.langBtn} ${currentLocale === 'en' ? styles.langActive : ''}`}
      >
        EN
      </button>
    </div>
  );
}
