'use client';

import { useEffect, useState } from 'react';
import type { TocEntry } from '../lib/posts';
import styles from '../styles/Post.module.css';

/** Sommaire avec suivi de position : la section en cours de lecture est mise en évidence. */
export default function TableOfContents({ toc, title, label }: { toc: TocEntry[]; title: string; label: string }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (toc.length === 0 || !('IntersectionObserver' in window)) return;
    const headings = toc.map(e => document.getElementById(e.id)).filter((h): h is HTMLElement => !!h);
    const visible = new Set<string>();
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id);
      }
      // La première section visible dans l'ordre du document ; à défaut, on garde la précédente.
      const first = headings.find(h => visible.has(h.id));
      if (first) setActive(first.id);
    }, { rootMargin: '-70px 0px -65% 0px' });
    headings.forEach(h => io.observe(h));
    return () => io.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  return (
    <nav className={styles.toc} aria-label={label}>
      <p className={styles.tocTitle}>{title}</p>
      <ul className={styles.tocList}>
        {toc.map(entry => (
          <li key={entry.id} className={styles.tocItem} data-level={entry.level}>
            <a
              href={`#${entry.id}`}
              className={styles.tocLink}
              aria-current={active === entry.id ? 'location' : undefined}
              data-active={active === entry.id}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
