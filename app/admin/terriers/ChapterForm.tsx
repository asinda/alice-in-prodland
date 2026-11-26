'use client';

import { useActionState, useState, useTransition } from 'react';
import type { DbChapter } from '@/lib/terriers';
import { actionSaveChapter } from '@/lib/actions/terriers';
import { actionRenderMarkdown } from '@/lib/actions/markdown';
import styles from '@/styles/Admin.module.css';

const TEMPLATE = "## Objectif\n\n## Ce que j'ai tenté\n\n## Ce qui a cassé\n\n## Ce que j'ai appris\n";

export default function ChapterForm({ terrierId, chapter }: { terrierId: string; chapter?: DbChapter }) {
  const [state, action, pending] = useActionState(actionSaveChapter, null);
  const result = state as { error?: string; success?: boolean } | null;
  const [content, setContent] = useState(chapter?.content ?? TEMPLATE);
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [previewHtml, setPreviewHtml] = useState('');
  const [isPreviewing, startPreview] = useTransition();

  function switchToPreview() {
    setTab('preview');
    startPreview(async () => setPreviewHtml(await actionRenderMarkdown(content)));
  }

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="terrierId" value={terrierId} />
      <input type="hidden" name="chapterId" value={chapter?.id ?? ''} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>titre (fr) *</label>
          <input name="title" required defaultValue={chapter?.title} className={styles.formInput}
            placeholder="Le pod qui ne démarre pas" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>ordre</label>
          <input name="order" type="number" min="0" defaultValue={chapter?.order ?? ''}
            placeholder="auto" className={styles.formInput} style={{ width: '90px' }} />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>accroche / teaser (fr)</label>
        <input name="hook" defaultValue={chapter?.hook} className={styles.formInput}
          placeholder="La phrase qui donne envie de lire ce chapitre" />
      </div>

      <div className={styles.formGroup}>
        <div className={styles.previewTabBar}>
          <label className={styles.formLabel}>contenu (markdown)</label>
          <div className={styles.previewTabs}>
            <button type="button" onClick={() => setTab('edit')}
              className={`${styles.previewTab} ${tab === 'edit' ? styles.previewTabActive : ''}`}>Éditer</button>
            <button type="button" onClick={switchToPreview}
              className={`${styles.previewTab} ${tab === 'preview' ? styles.previewTabActive : ''}`}>Aperçu</button>
          </div>
        </div>
        <textarea name="content" value={content} onChange={e => setContent(e.target.value)}
          className={styles.formTextarea} style={tab === 'preview' ? { display: 'none' } : {}} />
        {tab === 'preview' && (
          <div className={styles.previewPane}>
            {isPreviewing ? <p>Rendu en cours…</p> : <div dangerouslySetInnerHTML={{ __html: previewHtml }} />}
          </div>
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>3 points à retenir (fr)</label>
        <textarea name="takeaways" defaultValue={chapter?.takeaways.join('\n')} className={styles.formTextarea}
          style={{ minHeight: '80px' }} />
        <span className={styles.formHint}>un point par ligne</span>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>title (en)</label>
        <input name="titleEn" defaultValue={chapter?.titleEn} className={styles.formInput} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>hook (en)</label>
        <input name="hookEn" defaultValue={chapter?.hookEn} className={styles.formInput} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>content (en, markdown)</label>
        <textarea name="contentEn" defaultValue={chapter?.contentEn} className={styles.formTextarea} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>takeaways (en)</label>
        <textarea name="takeawaysEn" defaultValue={chapter?.takeawaysEn?.join('\n')}
          className={styles.formTextarea} style={{ minHeight: '80px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>statut</label>
          <select name="status" defaultValue={chapter?.status ?? 'draft'} className={styles.formInput}>
            <option value="planned">à venir (teasé)</option>
            <option value="draft">brouillon</option>
            <option value="published">publié</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>date prévue</label>
          <input name="plannedDate" type="date" defaultValue={chapter?.plannedDate?.slice(0, 10) ?? ''}
            className={styles.formInput} />
        </div>
      </div>

      {result?.error && <p className={styles.formError}>{result.error}</p>}
      {result?.success && <p className={styles.formSuccess}>✓ Sauvegardé</p>}

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.btnPrimary}>
          {pending ? '...' : chapter ? 'Sauvegarder' : 'Créer le chapitre'}
        </button>
      </div>
    </form>
  );
}
