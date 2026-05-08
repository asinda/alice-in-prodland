import Link from 'next/link';
import { logout } from '../../lib/actions/auth';
import styles from '../../styles/Admin.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <p className={styles.brandLine}>alice-in-prodland</p>
          <p className={styles.brandName}>$ admin</p>
        </div>

        <nav className={styles.sidebarNav}>
          <span className={styles.navSection}>contenu</span>
          <Link href="/admin/posts" className={styles.navLink}>
            <span className={styles.navIcon}>✦</span> Posts & Tutoriels
          </Link>
          <Link href="/admin/cours" className={styles.navLink}>
            <span className={styles.navIcon}>◈</span> Cours
          </Link>
          <Link href="/admin/obsidian" className={styles.navLink}>
            <span className={styles.navIcon}>◎</span> Obsidian Vault
          </Link>

          <span className={styles.navSection}>site</span>
          <Link href="/" className={styles.navLink} target="_blank">
            <span className={styles.navIcon}>↗</span> Voir le site
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <form action={logout}>
            <button type="submit" className={styles.logoutBtn}>
              ⎋ Déconnexion
            </button>
          </form>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
