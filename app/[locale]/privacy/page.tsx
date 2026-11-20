import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LEGAL } from '../../../lib/legal';
import styles from '../../../styles/About.module.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'fr' ? 'Confidentialité — alice-in-prodland' : 'Privacy — alice-in-prodland',
    alternates: { canonical: `/${locale}/privacy`, languages: { fr: '/fr/privacy', en: '/en/privacy' } },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const fr = locale === 'fr';

  return (
    <article className={styles.page}>
      <h1>{fr ? 'Politique de confidentialité' : 'Privacy policy'}</h1>

      <h2>{fr ? 'En bref' : 'In short'}</h2>
      <p>
        {fr
          ? "Ce site ne vous demande aucune information personnelle, ne comporte ni compte public, ni formulaire, ni publicité, et ne dépose aucun cookie de suivi."
          : 'This site asks for no personal information, has no public accounts, forms or ads, and sets no tracking cookies.'}
      </p>

      <h2>{fr ? 'Données traitées' : 'Data processed'}</h2>
      <ul>
        <li>
          {fr
            ? "Journaux techniques de l'hébergeur (adresse IP, page demandée, date) : nécessaires au fonctionnement et à la sécurité du service."
            : "Hosting provider technical logs (IP address, requested page, date): required to operate and secure the service."}
        </li>
        <li>
          {LEGAL.analytics
            ? (fr
                ? "Mesure d'audience anonyme via Cloudflare Web Analytics : sans cookie et sans identifiant persistant ; seules des statistiques agrégées (pages vues, pays, type d'appareil) sont produites."
                : 'Anonymous audience measurement via Cloudflare Web Analytics: no cookie and no persistent identifier; only aggregated statistics (page views, country, device type) are produced.')
            : (fr ? "Aucun outil de mesure d'audience n'est activé." : 'No audience measurement tool is enabled.')}
        </li>
        <li>
          {fr
            ? "Un cookie technique strictement nécessaire est utilisé uniquement pour l'espace d'administration (réservé à l'auteur) ; il n'est jamais déposé aux visiteurs."
            : 'A strictly necessary technical cookie is used only for the administration area (reserved to the author); it is never set for visitors.'}
        </li>
      </ul>

      <h2>{fr ? 'Vos droits' : 'Your rights'}</h2>
      <p>
        {fr
          ? "Conformément au RGPD, vous pouvez demander l'accès, la rectification ou l'effacement de vos données, ou vous opposer à leur traitement, en écrivant à"
          : 'Under the GDPR you may request access to, rectification or erasure of your data, or object to its processing, by writing to'}{' '}
        {LEGAL.email ? <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> : (fr ? "l'éditeur (voir les mentions légales)" : 'the publisher (see the legal notice)')}.{' '}
        {fr ? "Vous pouvez aussi saisir la CNIL (cnil.fr)." : 'You may also lodge a complaint with your data protection authority (in France: cnil.fr).'}
      </p>

      <h2>{fr ? 'Liens externes' : 'External links'}</h2>
      <p>
        {fr
          ? "Le site contient des liens vers des services tiers (GitHub, etc.) qui appliquent leur propre politique de confidentialité."
          : 'The site links to third-party services (GitHub, etc.) that apply their own privacy policies.'}
      </p>
    </article>
  );
}
