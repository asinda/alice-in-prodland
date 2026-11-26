'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import PostCard, { type CardPost } from './PostCard';
import { categoriesOf } from '../lib/categories';
import { clearHistory, historySnapshot, parse, savedSnapshot, serverSnapshot, subscribe } from '../lib/reading-store';
import styles from '../styles/Cards.module.css';
import ed from '../styles/Editorial.module.css';

/** Favoris, historique et suggestions : tout vient du navigateur du visiteur, rien n'est envoyé au serveur. */
export default function LibraryClient({ posts, locale }: { posts: CardPost[]; locale: string }) {
  const t = useTranslations('library');
  const saved = parse(useSyncExternalStore(subscribe, savedSnapshot, serverSnapshot));
  const history = parse(useSyncExternalStore(subscribe, historySnapshot, serverSnapshot));
  const bySlug = new Map(posts.map(p => [p.slug, p]));

  const pick = (entries: { slug: string }[]) => entries.map(e => bySlug.get(e.slug)).filter((p): p is CardPost => !!p);
  const savedPosts = pick(saved);
  const historyPosts = pick(history);

  // Suggestions : articles non lus des rubriques les plus consultées
  const weight = new Map<string, number>();
  for (const p of historyPosts) for (const c of categoriesOf(p.tags)) weight.set(c, (weight.get(c) ?? 0) + 1);
  const seen = new Set(historyPosts.map(p => p.slug));
  const suggestions = posts
    .filter(p => !seen.has(p.slug))
    .map(p => ({ p, score: categoriesOf(p.tags).reduce((s, c) => s + (weight.get(c) ?? 0), 0) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.dateLabel.localeCompare(a.p.dateLabel))
    .slice(0, 3)
    .map(x => x.p);

  const section = (title: string, list: CardPost[], empty: string, action?: React.ReactNode) => (
    <section className={ed.libSection}>
      <div className={ed.libHead}><h2 className={ed.sectionTitle}>{title}</h2>{action}</div>
      {list.length === 0 ? <p className={ed.emptyCat}>{empty}</p> : (
        <div className={styles.cardGrid}>{list.map(p => <PostCard key={p.slug} post={p} locale={locale} />)}</div>
      )}
    </section>
  );

  return (
    <>
      {section(t('saved'), savedPosts, t('savedEmpty'))}
      {suggestions.length > 0 && section(t('forYou'), suggestions, '')}
      {section(t('history'), historyPosts, t('historyEmpty'),
        historyPosts.length > 0 && <button type="button" className={ed.secondaryBtn} onClick={clearHistory}>{t('clear')}</button>)}
      <p className={ed.privacyNote}>{t('privacy')}</p>
    </>
  );
}
