import type { Metadata } from 'next';
import Link from 'next/link';
import FooterYear from '../components/FooterYear';
import ReadingProgress from '../components/ReadingProgress';
import '../styles/globals.css';
import 'highlight.js/styles/github-dark.css';
import styles from '../styles/Layout.module.css';

export const metadata: Metadata = {
  title: 'alice-in-prodland',
  description: 'SRE & DevOps war stories from the production trenches.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: '/apple-touch-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReadingProgress />
        <div className={styles.shell}>
          <header className={styles.header}>
            <nav className={styles.nav}>
              <Link href="/" className={styles.brand}>
                <span className={styles.prompt}>$</span>
                <span className={styles.brandName}>alice-in-prodland</span>
                <span className={styles.cursor}>▌</span>
              </Link>
              <div className={styles.links}>
                <Link href="/blog" className={styles.navLink}>blog</Link>
                <Link href="/cours" className={styles.navLink}>cours</Link>
                <Link href="/about" className={styles.navLink}>about</Link>
                <a
                  href="https://github.com/asinda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.navLink}
                >
                  github ↗
                </a>
              </div>
            </nav>
          </header>

          <main className={styles.main}>{children}</main>

          <footer className={styles.footer}>
            <div className={styles.footerInner}>
              <span className={styles.footerText}>
                Built with <span className={styles.heart}>♥</span> and too many{' '}
                <code>kubectl debug</code> sessions
              </span>
              <span className={styles.footerText}>
                © <FooterYear /> alice-in-prodland
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
