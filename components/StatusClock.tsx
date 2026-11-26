'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../styles/Layout.module.css';

/** Horloge UTC réelle, mise à jour chaque seconde. Rendu serveur : « --:--:-- » (évite tout écart à l'hydratation). */
function subscribe(cb: () => void): () => void {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
}
const snapshot = (): string => new Date().toISOString().slice(11, 19);
const serverSnapshot = (): string => '--:--:--';

export default function StatusClock() {
  const t = useTranslations('status');
  const time = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return (
    <div className={styles.status} role="status" aria-label={t('nominal')}>
      <span className={styles.statusDot} aria-hidden="true" />
      <span className={styles.statusText}>{t('nominal')}</span>
      <span className={styles.statusTime} aria-hidden="true">UTC {time}</span>
    </div>
  );
}
