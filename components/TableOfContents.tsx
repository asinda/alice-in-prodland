import type { TocEntry } from '../lib/posts';
import styles from '../styles/Post.module.css';

export default function TableOfContents({ toc, title, label }: { toc: TocEntry[]; title: string; label: string }) {
  if (toc.length === 0) return null;

  return (
    <nav className={styles.toc} aria-label={label}>
      <p className={styles.tocTitle}>{title}</p>
      <ul className={styles.tocList}>
        {toc.map(entry => (
          <li key={entry.id} className={styles.tocItem} data-level={entry.level}>
            <a href={`#${entry.id}`} className={styles.tocLink}>
              {entry.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
