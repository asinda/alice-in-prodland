'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from '../styles/Route.module.css';

export interface RouteCourse { slug: string; title: string; lessons: number; description: string }

/**
 * Parcours des cours : une carte (décorative) et la liste réelle des cours dessous.
 * Survoler ou activer un cours affiche son résumé ; la liste reste utilisable au clavier, au toucher et au lecteur d'écran.
 */
export default function CourseRoute({ courses, locale }: { courses: RouteCourse[]; locale: string }) {
  const t = useTranslations('route');
  const [active, setActive] = useState(0);
  const n = courses.length;
  if (n === 0) return null;

  // Points répartis sur la largeur, courbe douce (tangentes horizontales).
  const W = 900, PAD = 90;
  const pts = courses.map((_, i) => ({
    x: n === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (n - 1),
    y: 78 + 26 * Math.sin(i * 1.45 + 0.6),
  }));
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const q = pts[i - 1];
    const mx = (q.x + p.x) / 2;
    return `${acc} C${mx.toFixed(1)} ${q.y.toFixed(1)}, ${mx.toFixed(1)} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');
  const cur = courses[active] ?? courses[0];

  return (
    <div className={styles.route}>
      <svg className={styles.map} viewBox={`0 0 ${W} 150`} aria-hidden="true">
        <path className={styles.path} d={d} />
        {pts.map((p, i) => (
          <g
            key={courses[i].slug}
            className={styles.node}
            data-on={i === active ? 'true' : undefined}
            transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
          >
            <circle r={i === active ? 14 : 10} />
            <text className={styles.step} y="4" textAnchor="middle">{i + 1}</text>
            <text className={styles.label} y={i % 2 === 1 ? -20 : 34} textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'} x={i === 0 && n > 1 ? -14 : i === n - 1 && n > 1 ? 14 : 0}>{shorten(courses[i].title)}</text>
          </g>
        ))}
      </svg>

      <div className={styles.detail} aria-live="polite">
        <p className={styles.detailTitle}>{cur.title}</p>
        <p className={styles.detailMeta}>{t('lessons', { n: cur.lessons })}</p>
        {cur.description && <p className={styles.detailText}>{cur.description}</p>}
        <Link href={`/${locale}/cours/${cur.slug}`} className={styles.go}>{t('start')}</Link>
      </div>

      <ol className={styles.list} aria-label={t('label')}>
        {courses.map((c, i) => (
          <li key={c.slug} data-on={i === active ? 'true' : undefined}>
            <Link href={`/${locale}/cours/${c.slug}`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)}>
              <span className={styles.num}>{i + 1}</span>
              <span className={styles.name}>{c.title}</span>
              <span className={styles.count}>{t('lessons', { n: c.lessons })}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Libellé court pour la carte : on coupe au premier tiret long ou deux-points. */
function shorten(title: string): string {
  const cut = title.split(/\s[—–:-]\s/)[0].trim();
  if (cut.length <= 24) return cut;
  return cut.split(/\s+/).slice(0, 3).join(' ');
}
