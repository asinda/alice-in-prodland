import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTerrierById, getChapters } from '@/lib/terriers';
import { actionDeleteTerrier } from '@/lib/actions/terriers';
import TerrierForm from '../TerrierForm';
import styles from '@/styles/Admin.module.css';

const LABEL = { planned: 'à venir', draft: 'brouillon', published: 'publié' } as const;

export default async function EditTerrier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const terrier = getTerrierById(id);
  if (!terrier) notFound();
  const chapters = getChapters(id);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>🐇</span> {terrier.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/admin/terriers" className={styles.btnSecondary}>← Terriers</Link>
          <form action={actionDeleteTerrier.bind(null, id)}>
            <button type="submit" className={styles.btnDanger}>Supprimer</button>
          </form>
        </div>
      </div>

      <TerrierForm terrier={terrier} />

      <div className={styles.pageHeader} style={{ marginTop: '2.5rem' }}>
        <h2 className={styles.pageTitle}>Chapitres ({chapters.length}/{terrier.plannedDepth})</h2>
        <Link href={`/admin/terriers/${id}/chapters/new`} className={styles.btnPrimary}>+ Chapitre</Link>
      </div>

      {chapters.length === 0 ? (
        <p className={styles.empty}>Aucun chapitre pour l&apos;instant.</p>
      ) : (
        <table className={styles.table}>
          <thead><tr><th>#</th><th>Titre</th><th>Statut</th><th>Date prévue</th></tr></thead>
          <tbody>
            {chapters.map(c => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{c.order}</td>
                <td><Link href={`/admin/terriers/${id}/chapters/${c.id}`} style={{ color: 'var(--text-heading)' }}>{c.title}</Link></td>
                <td><span className={`${styles.badge} ${c.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>{LABEL[c.status]}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.plannedDate?.slice(0, 10) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
