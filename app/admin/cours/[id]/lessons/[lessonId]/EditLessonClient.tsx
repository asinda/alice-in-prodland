'use client';

import { useActionState, useState, useTransition } from 'react';
import Link from 'next/link';
import type { DbLesson } from '../../../../../../lib/db';
import { actionUpdateLesson, actionDeleteLesson } from '../../../../../../lib/actions/courses';
import { actionRenderMarkdown } from '../../../../../../lib/actions/markdown';
import styles from '../../../../../../styles/Admin.module.css';

export default function EditLessonClient({ courseId, lesson }: { courseId: string; lesson: DbLesson }) {
  const [state, action, pending] = useActionState(actionUpdateLesson, null);
  const [content, setContent] = useState(lesson.content);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPreviewing, startPreview] = useTransition();

  function switchToPreview() {
    setTab('preview');
    startPreview(async () => {
      const html = await actionRenderMarkdown(content);
      setPreviewHtml(html);
    });
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>✎</span> {lesson.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`/admin/cours/${courseId}`} className={styles.btnSecondary}>← Cours</Link>
          <form action={actionDeleteLesson.bind(null, courseId, lesson.id)}>
            <button type="submit" className={styles.btnDanger}
              onClick={e => { if (!confirm('Supprimer cette leçon ?')) e.preventDefault(); }}>
              Supprimer
            </button>
          </form>
        </div>
      </div>

      <form action={action} className={styles.form}>
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="lessonId" value={lesson.id} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>titre *</label>
            <input name="title" required defaultValue={lesson.title} className={styles.formInput} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ordre</label>
            <input name="order" type="number" min="0" defaultValue={lesson.order}
              className={styles.formInput} style={{ width: '80px' }} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <div className={styles.previewTabBar}>
            <label className={styles.formLabel}>contenu (markdown)</label>
            <div className={styles.previewTabs}>
              <button
                type="button"
                className={`${styles.previewTab} ${tab === 'edit' ? styles.previewTabActive : ''}`}
                onClick={() => setTab('edit')}
              >
                Éditer
              </button>
              <button
                type="button"
                className={`${styles.previewTab} ${tab === 'preview' ? styles.previewTabActive : ''}`}
                onClick={switchToPreview}
              >
                Aperçu
              </button>
            </div>
          </div>

          <textarea
            name="content"
            value={content}
            onChange={e => setContent(e.target.value)}
            className={styles.formTextarea}
            style={tab === 'preview' ? { display: 'none' } : {}}
          />

          {tab === 'preview' && (
            <div className={styles.previewPane}>
              {isPreviewing ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Rendu en cours…
                </p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              )}
            </div>
          )}
        </div>

        {state?.error && <p className={styles.formError}>{state.error}</p>}
        {state?.success && <p className={styles.formSuccess}>✓ Sauvegardé</p>}

        <div className={styles.formActions}>
          <button type="submit" disabled={pending} className={styles.btnPrimary}>
            {pending ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </form>
    </>
  );
}
