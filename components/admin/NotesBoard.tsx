'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { actionAddNote, actionDeleteNote, actionNoteToDraft, actionNoteToLesson, actionSaveNote, type NoteState } from '../../lib/actions/notes';
import styles from '../../styles/AdminNotes.module.css';

type Status = 'idee' | 'a_ecrire' | 'en_cours' | 'ecrit';

export interface NoteView {
  id: string; title: string; body: string; tags: string[]; status: Status; starred: boolean;
  targetSlot?: string; postId?: string; updatedAt: string;
}
export interface PlanView { slot: string; label: string; scheduledTitle?: string; noteTitle?: string }

const STATUS_LABEL: Record<Status, string> = { idee: 'Idée', a_ecrire: 'À écrire', en_cours: 'En cours', ecrit: 'Écrit' };
const STATUSES = Object.keys(STATUS_LABEL) as Status[];
const SAVE_DELAY_MS = 700;

interface Fields { title: string; body: string; tags: string; status: Status; starred: boolean; targetSlot: string }
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Éditeur d'une idée : tout est modifiable sur place et enregistré automatiquement après une courte pause de frappe.
 * Le composant est recréé à chaque changement de note (clé = identifiant), il garde donc ses propres valeurs en cours.
 */
function NoteEditor({ note, plan, courses, onDeleted }: { note: NoteView; plan: PlanView[]; courses: { id: string; title: string }[]; onDeleted: () => void }) {
  const [f, setF] = useState<Fields>({
    title: note.title, body: note.body, tags: note.tags.join(', '), status: note.status,
    starred: note.starred, targetSlot: note.targetSlot && plan.some(p => p.slot === note.targetSlot) ? note.targetSlot : '',
  });
  const [save, setSave] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const [, startSave] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Fields>(f);

  const flush = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const values = latest.current;
    if (!values.title.trim()) { setSave('error'); setError('Le titre ne peut pas être vide.'); return; }
    setSave('saving');
    startSave(async () => {
      const r = await actionSaveNote(note.id, values);
      if (r.ok) { setSave('saved'); setError(''); } else { setSave('error'); setError(r.error); }
    });
  };

  const change = (patch: Partial<Fields>, immediate = false) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setF(next);
    setSave('idle');
    if (timer.current) clearTimeout(timer.current);
    if (immediate) flush(); else timer.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  // Changement de note ou départ de la page : une modification en attente est enregistrée sans attendre
  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
      const v = latest.current;
      if (v.title.trim()) void actionSaveNote(note.id, v);
    }
  }, [note.id]);

  const label = save === 'saving' ? 'Enregistrement…' : save === 'saved' ? '✓ Enregistré' : save === 'error' ? error : 'Modifications enregistrées automatiquement';

  return (
    <div className={styles.editor}>
      <div className={styles.editorTop}>
        <input
          className={styles.titleInput}
          value={f.title}
          onChange={e => change({ title: e.target.value })}
          maxLength={200}
          aria-label="Titre de l’idée"
          placeholder="Titre du sujet"
        />
        <button
          type="button"
          className={styles.starBtn}
          aria-pressed={f.starred}
          onClick={() => change({ starred: !f.starred }, true)}
          title={f.starred ? 'Retirer la priorité' : 'Marquer prioritaire'}
        >
          {f.starred ? '★' : '☆'}<span className="sr-only">{f.starred ? ' Prioritaire' : ' Non prioritaire'}</span>
        </button>
      </div>

      <div className={styles.segment} role="group" aria-label="Avancement">
        {STATUSES.map(s => (
          <button key={s} type="button" aria-pressed={f.status === s} data-s={s} onClick={() => change({ status: s }, true)}>{STATUS_LABEL[s]}</button>
        ))}
      </div>

      <textarea
        className={styles.body}
        value={f.body}
        onChange={e => change({ body: e.target.value })}
        spellCheck={false}
        aria-label="Notes en Markdown"
        placeholder={'Angle, plan, commandes à tester, liens, questions…\n\nÉcrivez en Markdown. Tout est enregistré tout seul.'}
      />

      <div className={styles.fieldsRow}>
        <label>Tags
          <input value={f.tags} onChange={e => change({ tags: e.target.value })} placeholder="kubernetes, sre" />
        </label>
        <label>Créneau visé
          <select value={f.targetSlot} onChange={e => change({ targetSlot: e.target.value }, true)}>
            <option value="">Aucun</option>
            {plan.map(p => <option key={p.slot} value={p.slot}>{p.label}</option>)}
          </select>
        </label>
      </div>

      {courses.length > 0 && (
        <form action={actionNoteToLesson.bind(null, note.id)} className={styles.lessonForm} onSubmit={flush}>
          <label className="sr-only" htmlFor={`lesson-${note.id}`}>Cours qui reçoit la leçon</label>
          <select id={`lesson-${note.id}`} name="courseId" defaultValue="" required>
            <option value="" disabled>Ajouter cette note comme leçon à…</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button type="submit">Ajouter comme leçon</button>
        </form>
      )}

      <div className={styles.editorFoot}>
        <span className={styles.saveState} data-state={save} role="status">{label}</span>
        <div className={styles.footActions}>
          {note.postId ? (
            <Link href={`/admin/posts/${note.postId}`} className={styles.primary}>Ouvrir le brouillon →</Link>
          ) : (
            <form action={actionNoteToDraft.bind(null, note.id)}>
              <button type="submit" className={styles.primary} onClick={flush}>Créer le brouillon et écrire →</button>
            </form>
          )}
          <form action={actionDeleteNote.bind(null, note.id)}>
            <button
              type="submit"
              className={styles.danger}
              onClick={e => { if (!confirm('Supprimer cette idée ?')) e.preventDefault(); else onDeleted(); }}
            >
              Supprimer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Carnet d'idées : liste à gauche, éditeur modifiable sur place au centre, plan éditorial face aux prochains créneaux à droite.
 */
export default function NotesBoard({ notes, plan, courses }: { notes: NoteView[]; plan: PlanView[]; courses: { id: string; title: string }[] }) {
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [state, add, adding] = useActionState<NoteState, FormData>(actionAddNote, null);
  const [picked, setPicked] = useState<{ id: string; after: string | null } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Après un ajout réussi : champ vidé, curseur gardé dedans pour enchaîner les idées
  useEffect(() => {
    if (state?.ok) { formRef.current?.reset(); titleRef.current?.focus(); }
  }, [state]);

  const counts = Object.fromEntries(STATUSES.map(s => [s, notes.filter(n => n.status === s).length])) as Record<Status, number>;
  const shown = filter === 'all' ? notes : notes.filter(n => n.status === filter);

  // Sélection : le choix de l'utilisateur, sinon la dernière idée ajoutée, sinon la première
  const addedId = state?.id ?? null;
  const wanted = picked && picked.after === addedId ? picked.id : addedId;
  const current = notes.find(n => n.id === wanted) ?? shown[0] ?? notes[0] ?? null;
  const slotLabel = new Map(plan.map(p => [p.slot, p.label]));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Carnet</h1>
        <p className={styles.lead}>Les sujets à venir. Cliquez une idée pour la modifier : tout s’enregistre tout seul.</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.listCol} aria-label="Idées">
          <form ref={formRef} action={add} className={styles.capture}>
            <label className="sr-only" htmlFor="note-title">Nouvelle idée</label>
            <input id="note-title" ref={titleRef} name="title" required maxLength={200} placeholder="Nouvelle idée… (Entrée)" autoComplete="off" />
            <button type="submit" disabled={adding} aria-label="Ajouter l’idée">+</button>
          </form>
          {state?.error && <p className={styles.error}>{state.error}</p>}

          <div className={styles.filters} role="group" aria-label="Filtrer par avancement">
            <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Tout <span>{notes.length}</span></button>
            {STATUSES.map(s => (
              <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>{STATUS_LABEL[s]} <span>{counts[s]}</span></button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className={styles.empty}>{notes.length === 0 ? 'Aucune idée pour l’instant. Notez la première ci-dessus : un titre suffit.' : 'Rien dans cette catégorie.'}</p>
          ) : (
            <ul className={styles.list}>
              {shown.map(n => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={styles.row}
                    aria-current={current?.id === n.id ? 'true' : undefined}
                    onClick={() => setPicked({ id: n.id, after: addedId })}
                  >
                    <span className={styles.rowTitle}>{n.starred && <span className={styles.star} aria-hidden="true">★</span>}{n.title}</span>
                    <span className={styles.rowMeta}>
                      <span className={styles.status} data-s={n.status}>{STATUS_LABEL[n.status]}</span>
                      {n.targetSlot && slotLabel.has(n.targetSlot) && <span className={styles.slot}>{slotLabel.get(n.targetSlot)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.editorCol} aria-label="Éditeur de l’idée">
          {current
            ? <NoteEditor key={current.id} note={current} plan={plan} courses={courses} onDeleted={() => setPicked(null)} />
            : <p className={styles.empty}>Sélectionnez une idée, ou créez-en une.</p>}
        </section>

        <aside className={styles.plan} aria-label="Plan éditorial">
          <h2>Plan éditorial</h2>
          <p className={styles.planLead}>Prochains créneaux : lundi, mercredi, vendredi à 9 h (Paris).</p>
          <ol>
            {plan.map(p => (
              <li key={p.slot} data-state={p.scheduledTitle ? 'scheduled' : p.noteTitle ? 'idea' : 'free'}>
                <span className={styles.planDate}>{p.label}</span>
                {p.scheduledTitle && <span className={styles.planItem}><i>programmé</i>{p.scheduledTitle}</span>}
                {!p.scheduledTitle && p.noteTitle && <span className={styles.planItem}><i>idée</i>{p.noteTitle}</span>}
                {!p.scheduledTitle && !p.noteTitle && <span className={styles.planFree}>Libre</span>}
              </li>
            ))}
          </ol>
          <Link href="/admin/schedule" className={styles.planLink}>Ouvrir le calendrier →</Link>
        </aside>
      </div>
    </div>
  );
}
