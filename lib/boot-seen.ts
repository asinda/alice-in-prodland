/** Mémorise, pour la session du navigateur, que le journal de démarrage a déjà été joué. */
const KEY = 'cl:boot-seen';
const EVENT = 'cl:boot';

export function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** « 1 » = déjà joué. Rendu serveur : jamais joué, donc l'animation fait partie du HTML initial. */
export const seenSnapshot = (): string => { try { return sessionStorage.getItem(KEY) ?? ''; } catch { return ''; } };
export const seenServer = (): string => '';

export function markSeen(): void {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* stockage indisponible : l'effet se rejouera */ }
}
