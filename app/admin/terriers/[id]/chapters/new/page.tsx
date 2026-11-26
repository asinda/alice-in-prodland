import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTerrierById } from '@/lib/terriers';
import ChapterForm from '../../../ChapterForm';
import styles from '@/styles/Admin.module.css';

export default async function NewChapter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getTerrierById(id)) notFound();
  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>+</span> Nouveau chapitre</h1>
        <Link href={`/admin/terriers/${id}`} className={styles.btnSecondary}>← Terrier</Link>
      </div>
      <ChapterForm terrierId={id} />
    </>
  );
}
