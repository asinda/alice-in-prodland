'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import NewsletterForm from './NewsletterForm';
import styles from '../styles/Follow.module.css';

export const FOLLOW_EVENT = 'cl:follow';
export const openFollow = () => window.dispatchEvent(new Event(FOLLOW_EVENT));

/** Bouton « Suivre » (en-tête) et fenêtre d'abonnement. Peut aussi être ouverte depuis n'importe où via openFollow(). */
export default function FollowDialog({ locale }: { locale: string }) {
  const t = useTranslations('follow');
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const open = () => { if (ref.current && !ref.current.open) ref.current.showModal(); };
    window.addEventListener(FOLLOW_EVENT, open);
    return () => window.removeEventListener(FOLLOW_EVENT, open);
  }, []);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={openFollow}>{t('button')}</button>
      <dialog
        ref={ref}
        className={styles.dialog}
        aria-labelledby="follow-title"
        onClick={e => { if (e.target === ref.current) ref.current?.close(); }}
      >
        <div className={styles.inner}>
          <button type="button" className={styles.close} aria-label={t('close')} onClick={() => ref.current?.close()}>×</button>
          <h2 id="follow-title" className={styles.title}>{t('title')}</h2>
          <p className={styles.text}>{t('text')}</p>
          <ul className={styles.promise}>
            <li>{t('p1')}</li>
            <li>{t('p2')}</li>
            <li>{t('p3')}</li>
          </ul>
          <NewsletterForm locale={locale} source="follow" />
          <p className={styles.alt}>
            {t('or')} <a href={`/rss.xml?lang=${locale}`}>{t('rss')}</a>
          </p>
        </div>
      </dialog>
    </>
  );
}
