import Link from 'next/link';
import { getLocale } from 'next-intl/server';
import { LogoMark } from '../../components/Logo';
import styles from '../../styles/Editorial.module.css';

export default async function NotFound() {
  const locale = await getLocale();
  const fr = locale === 'fr';
  return (
    <div className={styles.notFound}>
      <LogoMark size={44} />
      <h1 className={styles.pageTitle}>{fr ? 'Cette page a planté.' : 'This page crashed.'}</h1>
      <p className={styles.pageLead}>
        {fr
          ? "Elle n'existe pas, ou elle a été déplacée. Ce n'est pas vous : l'adresse est peut-être mal tapée."
          : "It doesn't exist, or it has moved. It's not you: the address may be mistyped."}
      </p>
      <p className={styles.notFoundCode}><span>$</span> curl -I {fr ? 'cette-page' : 'this-page'} <span>→ 404 Not Found</span></p>
      <div className={styles.heroActions}>
        <Link href={`/${locale}`} className={styles.primaryBtn}>{fr ? "Retour à l'accueil" : 'Back to home'}</Link>
        <Link href={`/${locale}/blog`} className={styles.textLink}>{fr ? 'Voir les publications' : 'See the publications'}</Link>
      </div>
      <p className={styles.notFoundHint}>{fr ? "Astuce : appuyez sur / pour rechercher un article." : 'Tip: press / to search for an article.'}</p>
    </div>
  );
}
