'use client';

import { useState, useTransition } from 'react';
import { actionScheduleAtLocal, actionRemoveFromSchedule } from '../../lib/actions/schedule';
import styles from '../../styles/AdminImport.module.css';

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/**
 * « Publier plus tard » : programme la mise en ligne d'un article masqué à une date et une heure précises (heure de Paris).
 * Une fois programmé, l'article reste masqué jusqu'à cette heure ; la programmation peut être annulée.
 * La publication est faite par la tâche planifiée du site (la même que celle du calendrier) : elle ne tourne que le lundi, le mercredi et le vendredi vers 9 h 15.
 */
export default function SchedulePostForm({
  slug, source = 'db', kind = 'post', scheduled, disabled, compact = false,
}: {
  slug: string
  source?: 'db' | 'fs'
  /** « course » pour programmer la mise en ligne d'un cours. */
  kind?: 'post' | 'course'
  scheduled?: { id: string; scheduledAt: string }
  /** Par exemple : modifications non enregistrées. */
  disabled?: boolean
  compact?: boolean
}) {
  const [when, setWhen] = useState('');
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, start] = useTransition();

  if (scheduled) {
    return (
      <div className={styles.sched}>
        <span className={styles.schedChip}>Programmé : {fmt(scheduled.scheduledAt)}</span>
        <button
          type="button"
          className={styles.schedLink}
          disabled={pending}
          onClick={() => start(async () => { await actionRemoveFromSchedule(scheduled.id, slug); })}
        >
          Annuler la programmation
        </button>
      </div>
    );
  }

  const submit = () => {
    if (!when) { setMsg({ text: 'Choisissez une date et une heure.', error: true }); return; }
    start(async () => {
      const r = await actionScheduleAtLocal(slug, source, when, kind);
      setMsg(r.ok ? { text: 'Programmé.', error: false } : { text: r.error ?? 'Échec.', error: true });
      if (r.ok) setWhen('');
    });
  };

  return (
    <details className={compact ? styles.schedDetailsCompact : styles.schedDetails}>
      <summary>Publier plus tard</summary>
      <div className={styles.schedRow}>
        <label className="sr-only" htmlFor={`when-${slug}`}>Date et heure de publication (Paris)</label>
        <input id={`when-${slug}`} type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} disabled={disabled || pending} />
        <button type="button" onClick={submit} disabled={disabled || pending} title={disabled ? 'Enregistrez d’abord' : undefined}>
          {pending ? '…' : 'Programmer'}
        </button>
      </div>
      <p className={styles.schedHint}>{kind === 'course' ? 'Le cours' : 'L’article'} reste masqué jusqu’à cette date. La mise en ligne est faite par la tâche planifiée du site, qui tourne le lundi, le mercredi et le vendredi vers 9 h 15 (une publication à la fois). Il sortira donc à la première de ces occasions après la date choisie.</p>
      {msg && <p className={msg.error ? styles.schedError : styles.schedOk} role="status">{msg.text}</p>}
    </details>
  );
}
