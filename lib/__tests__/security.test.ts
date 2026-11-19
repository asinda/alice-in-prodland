import { describe, it, expect, afterEach, vi } from 'vitest'

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

describe('JWT secret', () => {
  it('lève une erreur en production sans JWT_SECRET', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', '')
    const { getJwtSecret } = await import('../auth')
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/)
  })

  it('lève une erreur en production si le secret est trop court', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', 'court')
    const { getJwtSecret } = await import('../auth')
    expect(() => getJwtSecret()).toThrow()
  })

  it('signe et vérifie un token avec un secret valide', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('JWT_SECRET', 'x'.repeat(40))
    const { signAdminToken, verifyAdminToken } = await import('../auth')
    const t = await signAdminToken()
    expect(await verifyAdminToken(t)).toBe(true)
    expect(await verifyAdminToken(t + 'a')).toBe(false)
  })
})

describe('rendu Markdown sanitisé', () => {
  it('neutralise script, handlers et javascript:', async () => {
    const { renderMarkdown } = await import('../posts')
    const { contentHtml } = await renderMarkdown(
      '## Titre\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[clic](javascript:alert(1))\n\n```bash\nls\n```'
    )
    expect(contentHtml).not.toMatch(/<script/i)
    expect(contentHtml).not.toMatch(/onerror/i)
    expect(contentHtml).not.toMatch(/javascript:/i)
    expect(contentHtml).toMatch(/id="titre"/)
    expect(contentHtml).toMatch(/hljs|language-bash/)
  })
})
