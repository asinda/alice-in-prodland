/** Favoris et historique de lecture, stockés dans le navigateur (localStorage). Rien n'est envoyé au serveur. */
export interface Entry { slug: string; at: number }

const SAVED = 'cl:saved';
const HISTORY = 'cl:history';
const EVENT = 'cl:store';
const MAX_HISTORY = 30;

function read(key: string): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(raw) ? raw.filter(e => e && typeof e.slug === 'string') : [];
  } catch { return []; }
}

function write(key: string, entries: Entry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(entries));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* stockage indisponible : on ignore */ }
}

export function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}

/** Instantanés sous forme de chaîne : stables tant que le contenu ne change pas (requis par useSyncExternalStore). */
export const savedSnapshot = (): string => { try { return localStorage.getItem(SAVED) ?? '[]'; } catch { return '[]'; } };
export const historySnapshot = (): string => { try { return localStorage.getItem(HISTORY) ?? '[]'; } catch { return '[]'; } };
export const serverSnapshot = (): string => '[]';

export function parse(snapshot: string): Entry[] {
  try { const v = JSON.parse(snapshot); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function toggleSaved(slug: string): void {
  const list = read(SAVED);
  write(SAVED, list.some(e => e.slug === slug) ? list.filter(e => e.slug !== slug) : [{ slug, at: Date.now() }, ...list]);
}

export function addHistory(slug: string): void {
  const list = read(HISTORY).filter(e => e.slug !== slug);
  write(HISTORY, [{ slug, at: Date.now() }, ...list].slice(0, MAX_HISTORY));
}

export function clearHistory(): void { write(HISTORY, []); }
