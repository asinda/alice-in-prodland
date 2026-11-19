import { describe, it, expect } from 'vitest'
import { rateLimit, rateLimitPeek, resetRateLimit } from '../rate-limit'

describe('rateLimit', () => {
  it('bloque après le maximum de tentatives, puis se réinitialise après la fenêtre', () => {
    const t0 = 1_000_000
    for (let i = 0; i < 5; i++) expect(rateLimit('k1', 5, 60_000, t0).ok).toBe(true)
    const blocked = rateLimit('k1', 5, 60_000, t0 + 1000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
    expect(rateLimit('k1', 5, 60_000, t0 + 61_000).ok).toBe(true)
  })

  it('est indépendant par clé et réinitialisable', () => {
    for (let i = 0; i < 6; i++) rateLimit('k2', 5, 60_000, 5)
    expect(rateLimit('k3', 5, 60_000, 5).ok).toBe(true)
    resetRateLimit('k2')
    expect(rateLimit('k2', 5, 60_000, 6).ok).toBe(true)
  })

  it('rateLimitPeek ne consomme pas de quota', () => {
    for (let i = 0; i < 10; i++) expect(rateLimitPeek('k4', 2, 10).ok).toBe(true)
    rateLimit('k4', 2, 60_000, 10)
    rateLimit('k4', 2, 60_000, 10)
    expect(rateLimitPeek('k4', 2, 11).ok).toBe(false)
  })
})
