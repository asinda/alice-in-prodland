import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Cover from './Cover';
import { categoriesOf } from '../lib/categories';
import type { Level } from '../lib/posts';
import styles from '../styles/Cards.module.css';

export interface CardPost {
  slug: string; title: string; excerpt: string; tags: string[]; dateLabel: string; readTime: number; level?: Level;
}

/** variant « lead » : grand article de la une ; « side » : colonne secondaire ; « grid » : grille des dernières publications. */
export default function PostCard({ post, locale, variant = 'grid' }: { post: CardPost; locale: string; variant?: 'lead' | 'side' | 'grid' }) {
  const t = useTranslations('home');
  const tCat = useTranslations('categories');
  const tLevel = useTranslations('level');
  const cat = categoriesOf(post.tags)[0];

  return (
    <Link href={`/${locale}/blog/${post.slug}`} className={`${styles.card} ${styles[variant]}`}>
      <span className={styles.media}><Cover category={cat} label={tCat(`${cat}.name`)} /></span>
      <span className={styles.body}>
        <span className={styles.meta}>
          <span>{post.dateLabel}</span>
        </span>
        <span className={styles.title}>{post.title}</span>
        {variant !== 'side' && <span className={styles.excerpt}>{post.excerpt}</span>}
        <span className={styles.foot}>
          {post.readTime} {t('readTime')}{post.level ? ` · ${tLevel(post.level)}` : ''}
        </span>
      </span>
    </Link>
  );
}
