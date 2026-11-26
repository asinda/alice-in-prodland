import { describe, it, expect, vi, beforeEach } from 'vitest'

// Aucun cookie : toute action admin doit rediriger vers le login AVANT de toucher aux données.
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT:${url}`) },
  notFound: () => { throw new Error('NOT_FOUND') },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const db = {
  createPost: vi.fn(), updatePost: vi.fn(), deletePost: vi.fn(), publishPost: vi.fn(),
  createCourse: vi.fn(), deleteCourse: vi.fn(), addLesson: vi.fn(),
}
vi.mock('../db', async (orig) => ({ ...(await orig<typeof import('../db')>()), ...db }))

// Tous les modules d'actions, sauf auth et leads (login, newsletter et contact sont publics par nature)
const modules = import.meta.glob('../actions/*.ts') as Record<string, () => Promise<Record<string, unknown>>>
const entries = Object.entries(modules).filter(([p]) => !p.endsWith('/auth.ts') && !p.endsWith('/leads.ts'))

beforeEach(() => vi.clearAllMocks())

describe('server actions admin : requireAdmin en première ligne', () => {
  it("découvre bien les modules d'actions", () => {
    expect(entries.length).toBeGreaterThanOrEqual(8)
  })

  for (const [file, load] of entries) {
    it(`${file.replace('../', 'lib/')} refuse toute action sans cookie admin`, async () => {
      const mod = await load()
      const actions = Object.entries(mod).filter(([, v]) => typeof v === 'function') as [string, (...a: unknown[]) => Promise<unknown>][]
      expect(actions.length).toBeGreaterThan(0)
      for (const [name, fn] of actions) {
        await expect(fn(), `${file}.${name}`).rejects.toThrow('REDIRECT:/admin/login')
      }
      for (const fn of Object.values(db)) expect(fn).not.toHaveBeenCalled()
    })
  }
})
