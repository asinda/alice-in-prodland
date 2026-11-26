import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getChapterById } from '@/lib/terriers';
import { actionDeleteChapter } from '@/lib/actions/terriers';
import ChapterForm from '../../../ChapterForm';
import styles from '@/styles/Admin.module.css';

export default async function EditChapter({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const { id, chapterId } = await params;
  const chapter = getChapterById(chapterId);
  if (!chapter || chapter.terrierId !== id) notFound();
  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>✎</span> {chapter.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`/admin/terriers/${id}`} className={styles.btnSecondary}>← Terrier</Link>
          <form action={actionDeleteChapter.bind(null, id, chapterId)}>
            <button type="submit" className={styles.btnDanger}>Supprimer</button>
          </form>
        </div>
      </div>
      <ChapterForm terrierId={id} chapter={chapter} />
    </>
  );
}
