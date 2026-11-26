import Link from 'next/link';
import { logout } from '../../lib/actions/auth';
import { SITE_NAME } from '../../lib/site';
import { LogoMark } from '../../components/Logo';
import AdminChrome from '../../components/admin/AdminChrome';
import AdminNav from '../../components/admin/AdminNav';
import AdminPalette from '../../components/admin/AdminPalette';
import AdminThemeToggle from '../../components/admin/AdminThemeToggle';
import styles from '../../styles/AdminShell.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminChrome
      side={
        <aside className={styles.side}>
          <Link href="/admin" className={styles.brand}>
            <LogoMark size={24} />
            <span>{SITE_NAME.toLowerCase()}</span>
            <small>admin</small>
          </Link>

          <AdminNav />

          <div className={styles.foot}>
            <AdminThemeToggle />
            <Link href="/" target="_blank">Voir le site ↗</Link>
            <form action={logout}>
              <button type="submit">Déconnexion</button>
            </form>
          </div>
        </aside>
      }
      palette={<AdminPalette />}
    >
      {children}
    </AdminChrome>
  );
}
