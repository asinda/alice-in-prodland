'use client';

import { useEffect } from 'react';

/**
 * Lueur du verre : un reflet doux suit le curseur sur le panneau survolé (.hud-box).
 * Pure décoration : rien n'est installé au toucher ni si l'utilisateur réduit les animations.
 */
export default function GlassGlow() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover)').matches) return;
    let frame = 0;
    let last: { el: HTMLElement; x: number; y: number } | null = null;

    const apply = () => {
      frame = 0;
      if (last) {
        last.el.style.setProperty('--gx', `${last.x}px`);
        last.el.style.setProperty('--gy', `${last.y}px`);
      }
    };
    const onMove = (e: PointerEvent) => {
      const box = (e.target as HTMLElement | null)?.closest?.('.hud-box') as HTMLElement | null;
      if (!box) return;
      const r = box.getBoundingClientRect();
      last = { el: box, x: e.clientX - r.left, y: e.clientY - r.top };
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return null;
}
