// Créneaux de publication : lundi, mercredi, vendredi à 9h, heure de Paris (heure d'été/hiver gérée).

const TZ = 'Europe/Paris'
export const PUBLICATION_DAYS = [1, 3, 5] as const // lundi, mercredi, vendredi (0 = dimanche)
export const PUBLICATION_HOUR = 9

type Ymd = { y: number; m: number; d: number }

function parts(date: Date): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value)
  }
  return out
}

/** Décalage de Paris par rapport à UTC (ms) à l'instant donné. */
function parisOffsetMs(at: Date): number {
  const p = parts(at)
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at.getTime() / 1000) * 1000
}

/** Convertit une heure locale de Paris en instant UTC. */
export function parisToUtc(y: number, m: number, d: number, hour: number, minute = 0): Date {
  const guess = Date.UTC(y, m - 1, d, hour, minute)
  const first = guess - parisOffsetMs(new Date(guess))
  return new Date(guess - parisOffsetMs(new Date(first)))
}

function parisDate(at: Date): Ymd {
  const p = parts(at)
  return { y: p.year, m: p.month, d: p.day }
}

/** Les `count` prochains créneaux (UTC) strictement postérieurs à `from`. */
export function nextPublicationSlots(count: number, from: Date = new Date()): Date[] {
  const start = parisDate(from)
  const slots: Date[] = []
  for (let i = 0; slots.length < count && i < 400; i++) {
    const day = new Date(Date.UTC(start.y, start.m - 1, start.d + i))
    if (!(PUBLICATION_DAYS as readonly number[]).includes(day.getUTCDay())) continue
    const slot = parisToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), PUBLICATION_HOUR)
    if (slot.getTime() > from.getTime()) slots.push(slot)
  }
  return slots
}

/** Libellé lisible d'un créneau, en heure de Paris. */
export function formatSlot(iso: string, locale = 'fr-FR'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/** Valeur d'un champ « datetime-local » (AAAA-MM-JJThh:mm, heure de Paris) vers un instant UTC. Null si invalide. */
export function parisLocalToUtc(local: string): Date | null {
  const m = LOCAL_RE.exec(local)
  if (!m) return null
  const [y, mo, d, h, mi] = m.slice(1).map(Number)
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null
  const date = parisToUtc(y, mo, d, h, mi)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Instant UTC (ISO) vers la valeur d'un champ « datetime-local » en heure de Paris. */
export function utcToParisLocal(iso: string): string {
  const p = parts(new Date(iso))
  const two = (n: number) => String(n).padStart(2, '0')
  return `${p.year}-${two(p.month)}-${two(p.day)}T${two(p.hour)}:${two(p.minute)}`
}
