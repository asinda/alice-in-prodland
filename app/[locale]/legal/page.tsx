import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LEGAL } from '../../../lib/legal';
import styles from '../../../styles/About.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'fr' ? 'Mentions légales — Jambo' : 'Legal notice — Jambo',
    alternates: { canonical: `/${locale}/legal`, languages: { fr: '/fr/legal', en: '/en/legal' } },
    robots: { index: true, follow: true },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const fr = locale === 'fr';

  return (
    <article className={styles.page}>
      <h1>{fr ? 'Mentions légales' : 'Legal notice'}</h1>

      <h2>{fr ? 'Éditeur du site' : 'Publisher'}</h2>
      <p>
        {fr ? 'Ce site est édité à titre personnel par' : 'This website is published on a personal basis by'}{' '}
        <strong>{LEGAL.name}</strong>.
      </p>
      <p>
        {fr ? 'Contact : ' : 'Contact: '}
        {LEGAL.email
          ? <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
          : (fr ? 'via le profil GitHub lié dans la barre de navigation.' : 'via the GitHub profile linked in the navigation bar.')}
      </p>

      <h2>{fr ? 'Hébergement' : 'Hosting'}</h2>
      <p>
        <a href={LEGAL.host.url} target="_blank" rel="noopener noreferrer">{LEGAL.host.name}</a>
        {LEGAL.host.address ? ` — ${LEGAL.host.address}` : ''}
      </p>

      <h2>{fr ? 'Propriété intellectuelle' : 'Intellectual property'}</h2>
      <p>
        {fr
          ? "Sauf mention contraire, les textes et le code de ce site sont la propriété de leur auteur. Toute reproduction substantielle nécessite son accord préalable ; les courtes citations avec lien vers la source sont bienvenues."
          : 'Unless stated otherwise, the texts and code on this site belong to their author. Substantial reproduction requires prior permission; short quotations with a link to the source are welcome.'}
      </p>

      <h2>{fr ? 'Responsabilité' : 'Liability'}</h2>
      <p>
        {fr
          ? "Les articles partagent un retour d'expérience et ne constituent pas un conseil professionnel. Les commandes et configurations doivent être validées dans votre contexte avant toute mise en production."
          : 'Articles share hands-on experience and are not professional advice. Commands and configurations must be validated in your own context before any production use.'}
      </p>
    </article>
  );
}
