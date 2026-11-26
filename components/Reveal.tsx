'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Apparition douce au défilement. Sans JavaScript ou avec « réduire les animations », le contenu est visible tel quel. */
export default function Reveal({
  as: Tag = 'div', className = '', children, ...rest
}: { as?: 'div' | 'section'; className?: string; children: ReactNode; 'aria-labelledby'?: string }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    // Déjà dans la fenêtre au chargement : on ne masque rien (évite un flash).
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.dataset.reveal = 'hidden';
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { el.dataset.reveal = 'shown'; io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <Tag ref={ref as never} className={`${className} reveal`} {...rest}>{children}</Tag>;
}
