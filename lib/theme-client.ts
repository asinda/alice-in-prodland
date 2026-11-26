/** Thème clair/sombre côté navigateur. Le choix est mémorisé sous la clé « theme » (partagée avec le site public). */
const KEY = 'theme';

export type Theme = 'light' | 'dark';

/** Thème réellement affiché : le choix explicite, sinon le réglage du système, sinon clair. */
export function effectiveTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applique et mémorise le thème. À appeler uniquement côté navigateur. */
export function setTheme(mode: Theme): void {
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* stockage indisponible : le thème vaut pour cette page seulement */
  }
}

/** Réapplique le choix mémorisé (sans choix, le réglage du système s'applique). */
export function applySavedTheme(): void {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch {
    /* stockage indisponible */
  }
}

/** Abonnement aux changements de thème (attribut de <html> ou réglage du système), pour useSyncExternalStore. */
export function subscribeTheme(cb: () => void): () => void {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', cb);
  return () => { observer.disconnect(); media.removeEventListener('change', cb); };
}
