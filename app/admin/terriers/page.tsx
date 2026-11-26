import Link from 'next/link';
import { getTerriers, getChapters } from '@/lib/terriers';
import styles from '@/styles/Admin.module.css';

const LABEL = { upcoming: 'à venir', active: 'en cours', done: 'terminé' } as const;

export default function AdminTerriers() {
  const terriers = getTerriers();
  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>🐇</span> Terriers</h1>
        <Link href="/admin/terriers/new" className={styles.btnPrimary}>+ Nouveau terrier</Link>
      </div>

      {terriers.length === 0 ? (
        <p className={styles.empty}>Aucun terrier. Creuse le premier.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Titre</th><th>Profondeur</th><th>État</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {terriers.map(t => {
              const published = getChapters(t.id, { status: 'published' }).length;
              return (
                <tr key={t.id}>
                  <td><Link href={`/admin/terriers/${t.id}`} style={{ color: 'var(--text-heading)' }}>{t.title}</Link></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {published}/{t.plannedDepth}
                  </td>
                  <td><span className={`${styles.badge} ${t.status === 'done' ? styles.badgePublished : styles.badgeDraft}`}>{LABEL[t.status]}</span></td>
                  <td><Link href={`/admin/terriers/${t.id}`} className={styles.btnSecondary}>Éditer</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
