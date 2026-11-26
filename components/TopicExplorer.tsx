'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Kind } from '../lib/severity';
import type { Level } from '../lib/posts';
import styles from '../styles/Home.module.css';

export interface ExplorerPost {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  dateLabel: string;
  kind: Kind;
  readTime: number;
  level?: Level;
}

const LEVEL_ORDER: Level[] = ['debutant', 'intermediaire', 'avance'];
const MAX_TOPICS = 7;

/** « Par où commencer ? » : trois objectifs, chacun filtre la liste sur un sujet. */
const PATHS = [
  { tag: 'kubernetes', title: 'pathK8sTitle', text: 'pathK8sText' },
  { tag: 'SRE', title: 'pathSreTitle', text: 'pathSreText' },
  { tag: 'devops', title: 'pathDevopsTitle', text: 'pathDevopsText' },
] as const;

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Props {
  posts: ExplorerPost[];
  locale: string;
  /** Nombre maximal de lignes affichées. */
  limit?: number;
  /** Page blog : pas de titre de section ni de lien « tout voir », pas d'aide au démarrage. */
  compact?: boolean;
  /** Sujet présélectionné (lien « Par où commencer »). */
  initialTopic?: string;
  /** Mode dense (accueil) : une ligne par article, sans extrait. */
  dense?: boolean;
}

/** Liste des articles filtrable en direct, par sujet et par mot. */
export default function TopicExplorer({ posts, locale, limit = 8, compact = false, initialTopic, dense = false }: Props) {
  const t = useTranslations('home');
  const tKind = useTranslations('kind');
  const [topic, setTopic] = useState<string | null>(initialTopic ?? null);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Level | null>(null);
  const [visible, setVisible] = useState(limit);
  const tLevel = useTranslations('level');
  const listRef = useRef<HTMLElement>(null);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, MAX_TOPICS);
  }, [posts]);

  const paths = PATHS.filter(p => posts.some(post => post.tags.includes(p.tag)));

  const q = fold(query.trim());
  const matching = posts.filter(p =>
    (!topic || p.tags.includes(topic)) &&
    (!level || p.level === level) &&
    (!q || fold(`${p.title} ${p.excerpt} ${p.tags.join(' ')}`).includes(q)),
  );
  const shown = matching.slice(0, visible);
  const levelsPresent = LEVEL_ORDER.filter(l => posts.some(p => p.level === l));
  const reset = () => setVisible(limit);

  const choosePath = (tag: string) => {
    setTopic(tag);
    setQuery('');
    reset();
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {!compact && paths.length > 0 && (
        <section className={styles.start} aria-labelledby="start-title">
          <h2 id="start-title" className={styles.startTitle}>{t('startTitle')}</h2>
          <p className={styles.startLead}>{t('startLead')}</p>
          <div className={styles.paths}>
            {paths.map(p => (
              <button key={p.tag} type="button" className={styles.path} onClick={() => choosePath(p.tag)}>
                <span className={styles.pathTitle}>{t(p.title)}</span>
                <span className={styles.pathText}>{t(p.text)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section ref={listRef} className={styles.explorer} data-dense={dense ? 'true' : undefined} aria-labelledby="explorer-title">
        <div className={styles.explorerHead}>
          <h2 id="explorer-title" className={compact ? 'sr-only' : styles.explorerTitle}>{t('pickTitle')}</h2>
          <p className={styles.explorerCount} role="status">{t('count', { n: matching.length })}</p>
        </div>

        <div className={styles.controls}>
          <input
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); reset(); }}
            placeholder={t('search')}
            aria-label={t('search')}
            className={styles.search}
          />
          <div className={styles.chips} role="group" aria-label={t('pickTitle')}>
            <button type="button" className={styles.chip} aria-pressed={topic === null} onClick={() => { setTopic(null); reset(); }}>
              {t('all')}
            </button>
            {topics.map(([tag, n]) => (
              <button
                key={tag}
                type="button"
                className={styles.chip}
                aria-pressed={topic === tag}
                onClick={() => { setTopic(topic === tag ? null : tag); reset(); }}
              >
                {tag} <span className={styles.chipN}>{n}</span>
              </button>
            ))}
          </div>
          {levelsPresent.length > 0 && (
            <div className={styles.chips} role="group" aria-label={tLevel('label')}>
              {levelsPresent.map(l => (
                <button
                  key={l}
                  type="button"
                  className={styles.chip}
                  aria-pressed={level === l}
                  onClick={() => { setLevel(level === l ? null : l); reset(); }}
                >
                  {tLevel(l)}
                </button>
              ))}
            </div>
          )}
        </div>

        {shown.length === 0 ? (
          <p className={styles.empty}>{t('empty')}</p>
        ) : (
          <ul className={styles.rows}>
            {shown.map(post => (
              <li key={post.slug} className={styles.row}>
                <Link href={`/${locale}/blog/${post.slug}`} className={styles.rowLink}>
                  <span className={styles.rowMeta}>
                    <span className={styles.rowDate}>{post.dateLabel}</span>
                    <span className={styles.kind} data-kind={post.kind}>{tKind(post.kind)}</span>
                    {post.level && <span className={styles.levelTag}>{tLevel(post.level)}</span>}
                  </span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowTitle}>{post.title}</span>
                    <span className={styles.rowExcerpt}>{post.excerpt}</span>
                  </span>
                  <span className={styles.rowTime}>{post.readTime} {t('readTime')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {matching.length > shown.length && (
          <p className={styles.viewAll}>
            <button type="button" className={styles.moreBtn} onClick={() => setVisible(v => v + limit)}>
              {t('loadMore', { n: matching.length - shown.length })}
            </button>
          </p>
        )}

        {!compact && matching.length <= shown.length && (
          <p className={styles.viewAll}>
            <Link href={`/${locale}/blog`} className={styles.viewAllLink}>{t('viewAll')}</Link>
          </p>
        )}
      </section>
    </>
  );
}
