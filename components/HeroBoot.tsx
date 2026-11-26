'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { markSeen, seenServer, seenSnapshot, subscribe } from '../lib/boot-seen';
import styles from '../styles/Boot.module.css';

/**
 * Journal de démarrage du hero : quatre lignes « tapées » à partir de données réelles du site (animation CSS).
 * Joué une fois par session : aux visites suivantes (retour à l'accueil, navigation interne), les lignes s'affichent directement.
 */
export default function HeroBoot({ lines }: { lines: { text: string; prompt?: boolean }[] }) {
  const seen = useSyncExternalStore(subscribe, seenSnapshot, seenServer) === '1';

  // La marque « déjà joué » est posée après le premier rendu, sans le modifier : l'animation en cours n'est pas interrompue.
  useEffect(() => { markSeen(); }, []);

  // Chaque ligne démarre quand la précédente est finie (durée ≈ 14 ms par caractère, « $ » compris).
  const timed = lines.reduce<{ chars: number; dur: number; start: number; text: string; prompt?: boolean }[]>((acc, l) => {
    const chars = l.text.length + (l.prompt ? 2 : 0);
    const dur = Math.max(0.2, chars * 0.014);
    const prev = acc[acc.length - 1];
    const start = prev ? prev.start + prev.dur + 0.08 : 0.15;
    return [...acc, { ...l, chars, dur, start }];
  }, []);
  const last = timed[timed.length - 1];
  const end = last ? last.start + last.dur : 0;

  return (
    <div className={styles.boot} data-seen={seen ? 'true' : undefined} aria-hidden="true">
      {timed.map((l, i) => (
        <p
          key={i}
          className={styles.line}
          data-prompt={l.prompt ? 'true' : undefined}
          style={{ ['--n' as string]: l.chars, ['--d' as string]: `${l.start.toFixed(2)}s`, ['--t' as string]: `${l.dur.toFixed(2)}s` }}
        >
          <span className={styles.typed}>{l.text}</span>
          {i === timed.length - 1 && <span className={styles.caret} style={{ ['--c' as string]: `${end.toFixed(2)}s` }} />}
        </p>
      ))}
    </div>
  );
}
