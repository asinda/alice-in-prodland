import Link from 'next/link';
import TerrierForm from '../TerrierForm';
import styles from '@/styles/Admin.module.css';

export default function NewTerrier() {
  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>+</span> Nouveau terrier</h1>
        <Link href="/admin/terriers" className={styles.btnSecondary}>← Retour</Link>
      </div>
      <TerrierForm />
    </>
  );
}
