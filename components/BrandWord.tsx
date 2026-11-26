'use client';

import { useEffect, useRef, useState } from 'react';

const GLYPHS = '01<>{}[]/_#$=+*';
const FRAMES = 14;
const STEP_MS = 38;

/**
 * Nom du site avec un effet de « décodage » : les lettres se brouillent puis se résolvent de gauche à droite.
 * Joué une fois au chargement, puis au survol du lien parent. Le texte réel reste dans le HTML et pour les lecteurs d'écran.
 */
export default function BrandWord({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const run = () => {
      if (timer.current) clearInterval(timer.current);
      let frame = 0;
      timer.current = setInterval(() => {
        frame += 1;
        const done = Math.floor((frame / FRAMES) * text.length);
        setShown(text.split('').map((ch, i) => (i < done || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(''));
        if (frame >= FRAMES) {
          if (timer.current) clearInterval(timer.current);
          setShown(text);
        }
      }, STEP_MS);
    };

    const link = ref.current?.closest('a');
    link?.addEventListener('mouseenter', run);
    link?.addEventListener('focus', run);
    const first = setTimeout(run, 350);

    return () => {
      clearTimeout(first);
      if (timer.current) clearInterval(timer.current);
      link?.removeEventListener('mouseenter', run);
      link?.removeEventListener('focus', run);
    };
  }, [text]);

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
