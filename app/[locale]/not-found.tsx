import Link from 'next/link';
import { getLocale } from 'next-intl/server';

export default async function NotFound() {
  const locale = await getLocale();
  const fr = locale === 'fr';
  return (
    <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
      <h1>404</h1>
      <p>{fr ? "Cette page n'existe pas ou a été déplacée." : 'This page does not exist or has moved.'}</p>
      <p><Link href={`/${locale}`}>{fr ? "← Retour à l'accueil" : '← Back to home'}</Link></p>
    </div>
  );
}
