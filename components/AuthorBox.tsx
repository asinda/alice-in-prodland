import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { findPortrait } from '../lib/portrait';
import styles from '../styles/Editorial.module.css';

/** Fiche auteur en fin d'article. Texte volontairement factuel : rôle, ce que fait le blog, liens. */
export default function AuthorBox({ locale }: { locale: string }) {
  const t = useTranslations('author');
  const portrait = findPortrait();
  return (
    <aside className={styles.author} aria-labelledby="author-name">
      {portrait && <Image src={portrait} alt="" width={72} height={72} className={styles.authorPhoto} />}
      <div>
        <p id="author-name" className={styles.authorName}>Alice Sindayigaya</p>
        <p className={styles.authorRole}>{t('role')}</p>
        <p className={styles.authorBio}>{t('bio')}</p>
        <p className={styles.authorLinks}>
          <Link href={`/${locale}/about`}>{t('about')}</Link>
          <a href="https://www.linkedin.com/in/alicesindayigaya" target="_blank" rel="noopener noreferrer">LinkedIn<span className="sr-only"> ({t('newTab')})</span></a>
          <a href="https://github.com/asinda" target="_blank" rel="noopener noreferrer">GitHub<span className="sr-only"> ({t('newTab')})</span></a>
        </p>
      </div>
    </aside>
  );
}
