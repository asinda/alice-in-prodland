import { describe, it, expect } from 'vitest'
import { buildPostText } from '../integrations/linkedin'

const base = { title: 'Mon titre', excerpt: 'Mon extrait', url: 'https://site/blog/x', tags: ['kubernetes', 'SRE'] }

describe('buildPostText', () => {
  it('utilise le teaser rédigé et ajoute le lien en fin de post', () => {
    const t = buildPostText({ ...base, text: 'Accroche\n\n- point 1\n\nQuestion ?\n#sre' })
    expect(t.startsWith('Accroche')).toBe(true)
    expect(t.endsWith('→ https://site/blog/x')).toBe(true)
    expect(t).not.toContain('Mon extrait')
  })

  it('retombe sur le modèle titre + extrait + hashtags sans teaser', () => {
    const t = buildPostText(base)
    expect(t).toContain('📝 Mon titre')
    expect(t).toContain('Mon extrait')
    expect(t).toContain('#kubernetes #SRE')
  })

  it('ignore un teaser vide', () => {
    expect(buildPostText({ ...base, text: '   ' })).toContain('📝 Mon titre')
  })
})
