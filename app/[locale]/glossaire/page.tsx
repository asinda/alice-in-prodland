import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { GLOSSARY } from '../../../lib/glossary';
import { SITE_NAME, SITE_URL } from '../../../lib/site';
import JsonLd from '../../../components/JsonLd';
import styles from '../../../styles/Editorial.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'glossary' });
  return { title: `${t('title')} — ${SITE_NAME}`, description: t('lead'), alternates: { canonical: `/${locale}/glossaire` } };
}

export default async function Glossary({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'glossary' });
  const lang = locale === 'en' ? 'en' : 'fr';
  const entries = GLOSSARY.map(g => ({ id: g.id, ...g[lang] })).sort((a, b) => a.term.localeCompare(b.term, lang));

  return (
    <>
      <header className={styles.pageHead}>
        <h1 className={styles.pageTitle}>{t('title')}</h1>
        <p className={styles.pageLead}>{t('lead')}</p>
      </header>
      <ul className={styles.glossIndex} aria-label={t('index')}>
        {entries.map(e => <li key={e.id}><a href={`#${e.id}`}>{e.term.split(' (')[0]}</a></li>)}
      </ul>
      <dl className={styles.glossary}>
        {entries.map(e => (
          <div key={e.id} id={e.id} className={styles.glossEntry}>
            <dt className={styles.glossTerm}>{e.term}</dt>
            <dd className={styles.glossDef}>{e.def}</dd>
          </div>
        ))}
      </dl>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: t('title'), inLanguage: lang,
        url: `${SITE_URL}/${locale}/glossaire`,
        hasDefinedTerm: entries.map(e => ({ '@type': 'DefinedTerm', name: e.term, description: e.def })),
      }} />
    </>
  );
}
