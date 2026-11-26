'use client';

import { useActionState } from 'react';
import type { DbTerrier } from '@/lib/terriers';
import { actionCreateTerrier, actionUpdateTerrier } from '@/lib/actions/terriers';
import styles from '@/styles/Admin.module.css';

export default function TerrierForm({ terrier }: { terrier?: DbTerrier }) {
  const [state, action, pending] = useActionState(
    terrier ? actionUpdateTerrier : actionCreateTerrier,
    null,
  );
  const result = state as { error?: string; success?: boolean } | null;

  return (
    <form action={action} className={styles.form}>
      {terrier && <input type="hidden" name="id" value={terrier.id} />}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>titre (fr) *</label>
        <input name="title" required defaultValue={terrier?.title} className={styles.formInput}
          placeholder="Le terrier Kubernetes" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>accroche (fr)</label>
        <input name="hook" defaultValue={terrier?.hook} className={styles.formInput}
          placeholder="Je descends dans les clusters, tu viens ?" />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>description (fr)</label>
        <textarea name="description" defaultValue={terrier?.description} className={styles.formTextarea}
          style={{ minHeight: '100px' }} />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>title (en)</label>
        <input name="titleEn" defaultValue={terrier?.titleEn} className={styles.formInput} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>hook (en)</label>
        <input name="hookEn" defaultValue={terrier?.hookEn} className={styles.formInput} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>description (en)</label>
        <textarea name="descriptionEn" defaultValue={terrier?.descriptionEn} className={styles.formTextarea}
          style={{ minHeight: '100px' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>état</label>
          <select name="status" defaultValue={terrier?.status ?? 'upcoming'} className={styles.formInput}>
            <option value="upcoming">à venir</option>
            <option value="active">en cours</option>
            <option value="done">terminé</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>profondeur prévue (nb de chapitres)</label>
          <input name="plannedDepth" type="number" min="1" defaultValue={terrier?.plannedDepth ?? 10}
            className={styles.formInput} />
        </div>
      </div>

      {result?.error && <p className={styles.formError}>{result.error}</p>}
      {result?.success && <p className={styles.formSuccess}>✓ Sauvegardé</p>}

      <div className={styles.formActions}>
        <button type="submit" disabled={pending} className={styles.btnPrimary}>
          {pending ? '...' : terrier ? 'Sauvegarder' : 'Créer le terrier'}
        </button>
      </div>
    </form>
  );
}
