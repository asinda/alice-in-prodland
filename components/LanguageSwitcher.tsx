'use client';

import { useRouter, usePathname } from 'next/navigation';
import styles from '../styles/Layout.module.css';

const NON_DEFAULT_LOCALES = ['en'];

export default function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    if (newLocale === currentLocale) return;

    // Strip current locale prefix if present (non-default locales have a prefix)
    let basePath = pathname;
    for (const loc of NON_DEFAULT_LOCALES) {
      if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
        basePath = pathname.slice(loc.length + 1) || '/';
        break;
      }
    }

    // Add new locale prefix only for non-default locales
    const newPath = newLocale === 'fr' ? basePath : `/${newLocale}${basePath}`;
    router.push(newPath);
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
