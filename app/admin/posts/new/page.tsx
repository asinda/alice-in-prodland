'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { actionCreatePost } from '../../../../lib/actions/posts';
import styles from '../../../../styles/Admin.module.css';

export default function NewPost() {
  const [state, action, pending] = useActionState(actionCreatePost, null);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}><span>+</span> Nouveau contenu</h1>
        <Link href="/admin/posts" className={styles.btnSecondary}>← Retour</Link>
      </div>

      <form action={action} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>type</label>
          <select name="type" className={styles.formSelect}>
            <option value="post">post</option>
            <option value="tutorial">tutorial</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>titre *</label>
          <input name="title" required className={styles.formInput} placeholder="Mon article..." />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>excerpt</label>
          <input name="excerpt" className={styles.formInput} placeholder="Une phrase de résumé..." />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>tags</label>
          <input name="tags" className={styles.formInput} placeholder="kubernetes, SRE, devops" />
          <span className={styles.formHint}>séparés par des virgules</span>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>contenu (markdown)</label>
          <textarea name="content" className={styles.formTextarea} placeholder="# Titre&#10;&#10;Mon contenu en markdown..." />
        </div>

        {state?.error && <p className={styles.formError}>{state.error}</p>}

        <div className={styles.formActions}>
          <button type="submit" disabled={pending} className={styles.btnPrimary}>
            {pending ? 'Création...' : 'Créer (brouillon)'}
          </button>
        </div>
      </form>
    </>
  );
}
