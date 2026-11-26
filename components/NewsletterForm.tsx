'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { subscribe, type LeadState } from '../lib/actions/leads';
import styles from '../styles/Editorial.module.css';

export default function NewsletterForm({ locale, source }: { locale: string; source: string }) {
  const t = useTranslations('newsletter');
  const [state, action, pending] = useActionState<LeadState, FormData>(subscribe, null);

  if (state?.ok) return <p className={styles.formOk} role="status">{t('done')}</p>;

  return (
    <form action={action} className={styles.nlForm}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />
      <input type="text" name="website" className={styles.trap} tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className={styles.nlRow}>
        <label className="sr-only" htmlFor={`nl-${source}`}>{t('label')}</label>
        <input id={`nl-${source}`} name="email" type="email" required autoComplete="email" placeholder={t('placeholder')} className={styles.nlInput} />
        <button type="submit" disabled={pending} className={styles.nlBtn}>{t('button')}</button>
      </div>
      <label className={styles.consent}>
        <input type="checkbox" name="consent" required /> <span>{t('consent')}</span>
      </label>
      {state?.error && <p className={styles.formErr} role="alert">{t(`error.${state.error}`)}</p>}
    </form>
  );
}
