'use client';

import { Link, usePathname } from '../i18n/navigation';
import styles from '../styles/Layout.module.css';

const LANGS = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
] as const;

/**
 * Vrais liens (crawlables, utilisables sans JS) vers la même page dans l'autre langue.
 * `usePathname` de next-intl renvoie le chemin SANS préfixe de locale.
 */
export default function LanguageSwitcher({ currentLocale, ariaLabel }: { currentLocale: string; ariaLabel: string }) {
  const pathname = usePathname();

  return (
    <div className={styles.langSwitcher} role="group" aria-label={ariaLabel}>
      {LANGS.map((l, i) => (
        <span key={l.code}>
          {i > 0 && <span className={styles.langSep} aria-hidden="true">|</span>}
          <Link
            href={pathname}
            locale={l.code}
            lang={l.code}
            hrefLang={l.code}
            aria-label={l.name}
            aria-current={currentLocale === l.code ? 'true' : undefined}
            className={`${styles.langBtn} ${currentLocale === l.code ? styles.langActive : ''}`}
          >
            {l.label}
          </Link>
        </span>
      ))}
    </div>
  );
}
