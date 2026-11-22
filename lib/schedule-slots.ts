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
export function parisToUtc(y: number, m: number, d: number, hour: number): Date {
  const guess = Date.UTC(y, m - 1, d, hour)
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
