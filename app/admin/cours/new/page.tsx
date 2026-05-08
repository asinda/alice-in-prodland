'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { actionCreateCourse } from '../../../../lib/actions/courses';
import styles from '../../../../styles/Admin.module.css';

export default function NewCours() {
  const [state, action, pending] = useActionState(actionCreateCourse, null);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>+</span> Nouveau cours</h1>
        <Link href="/admin/cours" className={styles.btnSecondary}>← Retour</Link>
      </div>

      <form action={action} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>titre *</label>
          <input name="title" required className={styles.formInput} placeholder="Kubernetes pour les SRE..." />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>description</label>
          <textarea name="description" className={styles.formTextarea} style={{ minHeight: '120px' }}
            placeholder="Ce cours couvre..." />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>tags</label>
          <input name="tags" className={styles.formInput} placeholder="kubernetes, SRE" />
          <span className={styles.formHint}>séparés par des virgules</span>
        </div>

        {state?.error && <p className={styles.formError}>{state.error}</p>}

        <div className={styles.formActions}>
          <button type="submit" disabled={pending} className={styles.btnPrimary}>
            {pending ? 'Création...' : 'Créer le cours'}
          </button>
        </div>
      </form>
    </>
  );
}
