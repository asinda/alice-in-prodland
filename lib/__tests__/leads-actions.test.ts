import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '1.2.3.4' }) }))
const store = vi.hoisted(() => ({ addSubscriber: vi.fn(() => true), addMessage: vi.fn() }))
vi.mock('../leads', async (orig) => ({ ...(await orig<typeof import('../leads')>()), ...store }))

import { subscribe, sendContact } from '../actions/leads'
import { resetRateLimit } from '../rate-limit'

const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f }

beforeEach(() => {
  vi.clearAllMocks()
  resetRateLimit('newsletter:1.2.3.4')
  resetRateLimit('contact:1.2.3.4')
})

describe('newsletter', () => {
  it('enregistre une adresse valide avec consentement', async () => {
    expect(await subscribe(null, form({ email: 'a@b.fr', consent: 'on', locale: 'en' }))).toEqual({ ok: true })
    expect(store.addSubscriber).toHaveBeenCalledWith({ email: 'a@b.fr', locale: 'en', source: 'site' })
  })
  it('refuse une adresse invalide ou sans consentement', async () => {
    expect(await subscribe(null, form({ email: 'nope', consent: 'on' }))).toEqual({ error: 'invalid' })
    expect(await subscribe(null, form({ email: 'a@b.fr' }))).toEqual({ error: 'consent' })
    expect(store.addSubscriber).not.toHaveBeenCalled()
  })
  it('ignore silencieusement un robot (champ piège rempli)', async () => {
    expect(await subscribe(null, form({ email: 'a@b.fr', consent: 'on', website: 'http://spam' }))).toEqual({ ok: true })
    expect(store.addSubscriber).not.toHaveBeenCalled()
  })
  it('limite le nombre de tentatives par IP', async () => {
    for (let i = 0; i < 5; i++) await subscribe(null, form({ email: 'a@b.fr', consent: 'on' }))
    expect(await subscribe(null, form({ email: 'a@b.fr', consent: 'on' }))).toEqual({ error: 'rate' })
  })
})

describe('contact', () => {
  const ok = { name: 'Eve', email: 'e@x.io', message: 'Bonjour, un projet.', consent: 'on' }
  it('enregistre un message complet', async () => {
    expect(await sendContact(null, form(ok))).toEqual({ ok: true })
    expect(store.addMessage).toHaveBeenCalledOnce()
  })
  it('refuse un message trop court, sans nom ou sans consentement', async () => {
    expect(await sendContact(null, form({ ...ok, message: 'court' }))).toEqual({ error: 'invalid' })
    expect(await sendContact(null, form({ ...ok, name: '' }))).toEqual({ error: 'invalid' })
    expect(await sendContact(null, form({ ...ok, consent: '' }))).toEqual({ error: 'consent' })
    expect(store.addMessage).not.toHaveBeenCalled()
  })
})
