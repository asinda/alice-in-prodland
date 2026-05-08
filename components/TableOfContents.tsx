import type { TocEntry } from '../lib/posts';
import styles from '../styles/Post.module.css';

export default function TableOfContents({ toc }: { toc: TocEntry[] }) {
  if (toc.length === 0) return null;

  return (
    <nav className={styles.toc}>
      <p className={styles.tocTitle}>Table des matières</p>
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
