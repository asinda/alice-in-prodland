import Link from 'next/link';
import styles from '../styles/Home.module.css';

export default function NotFound() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroTerminal}>
        <div className={styles.terminalBar}>
          <span className={styles.dot} data-color="red" />
          <span className={styles.dot} data-color="yellow" />
          <span className={styles.dot} data-color="green" />
          <span className={styles.terminalTitle}>alice@prodland ~ $</span>
        </div>
        <div className={styles.terminalBody}>
          <p className={styles.terminalLine}>
            <span className={styles.prompt}>➜</span>{' '}
            <span className={styles.cmd}>curl this-page</span>
          </p>
          <p className={styles.terminalOutput}>curl: (404) Not Found</p>
          <p className={styles.terminalLine}>
            <span className={styles.prompt}>➜</span>{' '}
            <span className={styles.cmd}>echo $?</span>
          </p>
          <p className={styles.terminalOutput}>404</p>
          <p className={styles.terminalLine}>
            <span className={styles.prompt}>➜</span>{' '}
            <span className={styles.blinkCursor}>▌</span>
          </p>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--accent)' }}>
          ← Retour à l'accueil
        </Link>
      </div>
    </section>
  );
}
