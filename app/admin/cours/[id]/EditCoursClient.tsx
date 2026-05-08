'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import type { DbCourse, IntegrationStatus } from '../../../../lib/db';
import {
  actionUpdateCourse, actionPublishCourse, actionDeleteCourse,
  actionAddLesson, actionDeleteLesson, actionRepushCourseIntegrations,
} from '../../../../lib/actions/courses';
import { getGumroadDashboardUrl } from '../../../../lib/integrations/gumroad';
import styles from '../../../../styles/Admin.module.css';

function IntegBadge({ status }: { status: IntegrationStatus }) {
  const cls = {
    idle: styles.badgeIdle,
    success: styles.badgePublished,
    error: styles.badgeError,
    skipped: styles.badgeSkipped,
  }[status];
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
}

export default function EditCoursClient({ course }: { course: DbCourse }) {
  const [courseState, courseAction, coursePending] = useActionState(actionUpdateCourse, null);
  const [lessonState, lessonAction, lessonPending] = useActionState(actionAddLesson, null);
  const [copied, setCopied] = useState(false);

  function copyCaption(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sortedLessons = [...course.lessons].sort((a, b) => a.order - b.order);

  const gumroadDashboardUrl = getGumroadDashboardUrl({
    title: course.title,
    description: course.description,
    tags: course.tags,
    gumroadUrl: course.gumroadUrl,
  });

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>◈</span> {course.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/admin/cours" className={styles.btnSecondary}>← Retour</Link>
          {course.status === 'draft' && (
            <form action={actionPublishCourse.bind(null, course.id)}>
              <button type="submit" className={styles.btnGreen}>→ Publier</button>
            </form>
          )}
          <form action={actionDeleteCourse.bind(null, course.id)}>
            <button type="submit" className={styles.btnDanger}
              onClick={e => { if (!confirm('Supprimer ce cours ?')) e.preventDefault(); }}>
              Supprimer
            </button>
          </form>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <span className={`${styles.badge} ${course.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>
          {course.status}
        </span>
      </div>

      <form action={courseAction} className={styles.form} style={{ marginBottom: '2.5rem' }}>
        <input type="hidden" name="id" value={course.id} />

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>titre *</label>
          <input name="title" required defaultValue={course.title} className={styles.formInput} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>description</label>
          <textarea name="description" defaultValue={course.description}
            className={styles.formTextarea} style={{ minHeight: '120px' }} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>tags</label>
          <input name="tags" defaultValue={course.tags.join(', ')} className={styles.formInput} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>URL Gumroad</label>
          <input name="gumroadUrl" defaultValue={course.gumroadUrl} className={styles.formInput}
            placeholder="https://yourname.gumroad.com/l/..." />
          <span className={styles.formHint}>
            Pas encore de produit ?{' '}
            <a href={gumroadDashboardUrl} target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Créer sur Gumroad ↗
            </a>
          </span>
        </div>

        {courseState?.error && <p className={styles.formError}>{courseState.error}</p>}
        {courseState?.success && <p className={styles.formSuccess}>✓ Sauvegardé</p>}

        <div className={styles.formActions}>
          <button type="submit" disabled={coursePending} className={styles.btnPrimary}>
            {coursePending ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </form>

      {course.status === 'published' && (
        <section className={styles.diffusion} style={{ marginBottom: '2.5rem' }}>
          <div className={styles.diffusionHeader}>
            <span>Diffusion</span>
            <form action={actionRepushCourseIntegrations.bind(null, course.id)}>
              <button type="submit" className={styles.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                ↺ Re-push
              </button>
            </form>
          </div>

          <div className={styles.diffusionRow}>
            <span className={styles.diffusionPlatform}>LinkedIn</span>
            <IntegBadge status={course.integrations.linkedin.status} />
            {course.integrations.linkedin.url && (
              <a href={course.integrations.linkedin.url} target="_blank" rel="noreferrer"
                className={styles.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                Voir ↗
              </a>
            )}
            {course.integrations.linkedin.error && (
              <span className={styles.diffusionError}>{course.integrations.linkedin.error}</span>
            )}
          </div>

          <div className={styles.diffusionRow}>
            <span className={styles.diffusionPlatform}>Gumroad</span>
            <IntegBadge status={course.integrations.gumroad.status} />
            {course.integrations.gumroad.url && (
              <a href={course.integrations.gumroad.url} target="_blank" rel="noreferrer"
                className={styles.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                Voir ↗
              </a>
            )}
            {course.integrations.gumroad.error && (
              <span className={styles.diffusionError}>{course.integrations.gumroad.error}</span>
            )}
          </div>

          <div className={styles.diffusionRow}>
            <span className={styles.diffusionPlatform}>TikTok</span>
            <IntegBadge status={course.integrations.tiktok.status} />
            {course.integrations.tiktok.id && (
              <button type="button" onClick={() => copyCaption(course.integrations.tiktok.id!)}
                className={styles.btnSecondary} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
                {copied ? '✓ Copié' : 'Copier caption'}
              </button>
            )}
            {course.integrations.tiktok.error && (
              <span className={styles.diffusionError}>{course.integrations.tiktok.error}</span>
            )}
          </div>
        </section>
      )}

      <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--text-heading)', marginBottom: '1rem' }}>
        Leçons ({sortedLessons.length})
      </h2>

      {sortedLessons.length > 0 && (
        <div className={styles.lessonList}>
          {sortedLessons.map(lesson => (
            <div key={lesson.id} className={styles.lessonRow}>
              <span className={styles.lessonOrder}>{lesson.order + 1}</span>
              <span className={styles.lessonTitle}>{lesson.title}</span>
              <Link href={`/admin/cours/${course.id}/lessons/${lesson.id}`} className={styles.btnSecondary}>
                Éditer
              </Link>
              <form action={actionDeleteLesson.bind(null, course.id, lesson.id)}>
                <button type="submit" className={styles.btnDanger}
                  onClick={e => { if (!confirm('Supprimer cette leçon ?')) e.preventDefault(); }}>
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        + Ajouter une leçon
      </h3>
      <form action={lessonAction} className={styles.form}>
        <input type="hidden" name="courseId" value={course.id} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>titre *</label>
            <input name="title" required className={styles.formInput} placeholder="Introduction à kubectl..." />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ordre</label>
            <input name="order" type="number" min="0" defaultValue={sortedLessons.length}
              className={styles.formInput} style={{ width: '80px' }} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>contenu (markdown)</label>
          <textarea name="content" className={styles.formTextarea} placeholder="# Introduction&#10;&#10;Dans cette leçon..." />
        </div>

        {lessonState?.error && <p className={styles.formError}>{lessonState.error}</p>}
        {lessonState?.success && <p className={styles.formSuccess}>✓ Leçon ajoutée</p>}

        <div className={styles.formActions}>
          <button type="submit" disabled={lessonPending} className={styles.btnPrimary}>
            {lessonPending ? 'Ajout...' : 'Ajouter la leçon'}
          </button>
        </div>
      </form>
    </>
  );
}
