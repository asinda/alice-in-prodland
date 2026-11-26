'use client';

import { useActionState, useState } from 'react';
import { actionImportNote, type ImportState } from '../../lib/actions/obsidian';
import styles from '../../styles/AdminImport.module.css';

/** Import d'une autre note : texte collé ou fichier .md/.txt, vers un article (brouillon) ou une leçon de cours. */
export default function ImportNoteForm({ courses }: { courses: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(actionImportNote, null);
  const [target, setTarget] = useState<'post' | 'lesson'>('post');

  return (
    <form action={action} className={styles.form}>
      <h2 className={styles.heading}>Importer une autre note</h2>
      <p className={styles.lead}>Collez du texte ou choisissez un fichier (.md, .markdown, .txt). Tout est créé en brouillon.</p>

      <label className={styles.field}>Titre (facultatif : repris du premier titre de la note)
        <input name="title" maxLength={200} placeholder="Titre de l’article ou de la leçon" />
      </label>
      <label className={styles.field}>Texte
        <textarea name="content" rows={8} spellCheck={false} placeholder="Collez ici votre note en Markdown…" />
      </label>
      <label className={styles.field}>… ou un fichier
        <input type="file" name="file" accept=".md,.markdown,.txt,text/markdown,text/plain" />
      </label>

      <fieldset className={styles.target}>
        <legend>Importer comme</legend>
        <label><input type="radio" name="target" value="post" checked={target === 'post'} onChange={() => setTarget('post')} /> Article (brouillon)</label>
        <label><input type="radio" name="target" value="lesson" checked={target === 'lesson'} onChange={() => setTarget('lesson')} /> Leçon d’un cours</label>
      </fieldset>

      {target === 'lesson' && (
        <label className={styles.field}>Cours qui reçoit la leçon
          <select name="courseId" defaultValue="" required>
            <option value="" disabled>Choisir un cours</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </label>
      )}

      {state?.error && <p className={styles.error} role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className={styles.btn}>{pending ? 'Import…' : 'Importer'}</button>
    </form>
  );
}
